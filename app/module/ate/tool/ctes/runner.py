"""CTES handle runner — the uniform execution shim.

Usage:  python3 runner.py <pkg_dir> <module:function>

Reads a JSON payload from stdin (empty stdin → ``{}``), imports the entry
function from the package, calls it with the payload, and writes exactly one
JSON envelope to stdout:

    {"ok": true,  "result": <return value>}
    {"ok": false, "error": "<message>", "error_type": "<class name>"}

Exit code is 0 iff the envelope is ``ok``. While the handle executes, its
stdout is redirected to stderr, so the process stdout carries only the
envelope — the machine channel stays clean regardless of handler prints;
everything the handle prints (and any traceback) lands in the run log.

Both execution backends (backends.py) launch this shim identically: the
docker backend mounts it read-only into a disposable container, the
subprocess backend runs it with the venv's own python.
"""
import contextlib
import importlib
import io
import json
import sys
import traceback


def _fail(message, error_type):
    """Emit an error envelope and return a failing exit code."""
    json.dump({"ok": False, "error": message, "error_type": error_type},
              sys.stdout)
    sys.stdout.write("\n")
    return 1


def main():
    if len(sys.argv) != 3:
        return _fail("usage: runner.py <pkg_dir> <module:function>", "UsageError")
    pkg_dir, entry_point = sys.argv[1], sys.argv[2]
    module_name, _, func_name = entry_point.partition(":")
    if not module_name or not func_name:
        return _fail(
            f"entry_point must be 'module:function', got {entry_point!r}",
            "UsageError")

    try:
        raw = sys.stdin.read()
        payload = json.loads(raw) if raw.strip() else {}
    except ValueError as exc:
        return _fail(f"invalid JSON payload on stdin: {exc}", "PayloadError")

    if pkg_dir not in sys.path:
        sys.path.insert(0, pkg_dir)
    try:
        fn = getattr(importlib.import_module(module_name), func_name)
    except BaseException:
        sys.stderr.write(traceback.format_exc())
        return _fail(f"cannot import entry point {entry_point!r}", "ImportError")

    # The handle's own prints are its log, not the result channel.
    sink = io.StringIO()
    try:
        with contextlib.redirect_stdout(sys.stderr):
            result = fn(payload)
    except BaseException:
        sys.stderr.write(traceback.format_exc())
        return _fail("handle raised (see the run log on stderr)", "HandleError")
    finally:
        log = sink.getvalue()
        if log:  # pragma: no cover - only if a handler writes via fd 1
            sys.stderr.write(log)

    try:
        json.dump({"ok": True, "result": result}, sys.stdout)
        sys.stdout.write("\n")
    except (TypeError, ValueError) as exc:
        return _fail(f"result is not JSON-serializable: {exc}", "ResultError")
    return 0


if __name__ == "__main__":
    sys.exit(main())
