"""CTES execution backends — run a handle in a self-contained environment.

Two backends share one contract (``runner.py``: JSON payload on stdin, one
JSON envelope on stdout, exit code carries success):

- ``subprocess`` — the venv's own python runs the shim directly. Fast, no
  isolation; the default for tests and development.
- ``docker`` — ``docker run --rm -i --network none`` with the handle package
  and the shim mounted read-only: each run executes in a disposable,
  network-less container — the self-contained execution environment.
  Requires the docker CLI on the host; unavailable inside the deployed
  ``autoregia`` container (which has no docker socket).

Selection: ``CTES_EXEC_BACKEND`` (``docker`` | ``subprocess`` | ``auto`` —
default ``auto`` = docker when the CLI is present, else subprocess).
"""
import json
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
RUNNER = os.path.join(HERE, "runner.py")

DOCKER_IMAGE = os.environ.get("CTES_DOCKER_IMAGE", "python:3.12-alpine")
DOCKER_MEM = os.environ.get("CTES_DOCKER_MEM", "256m")
DOCKER_CPUS = os.environ.get("CTES_DOCKER_CPUS", "1")


def docker_available():
    """True when the docker CLI exists on this host."""
    return shutil.which("docker") is not None


def docker_image_ready(image=None):
    """True when *image* exists locally (no pull is ever attempted)."""
    if not docker_available():
        return False
    proc = subprocess.run(["docker", "image", "inspect", image or DOCKER_IMAGE],
                          capture_output=True)
    return proc.returncode == 0


def default_backend():
    chosen = os.environ.get("CTES_EXEC_BACKEND", "auto").strip().lower()
    if chosen in ("docker", "subprocess"):
        return chosen
    return "docker" if docker_available() else "subprocess"


def backend_info():
    return {
        "default": default_backend(),
        "docker_cli": docker_available(),
        "docker_image": DOCKER_IMAGE,
        "docker_image_ready": docker_image_ready(),
    }


def _docker_cmd(pkg_dir, entry_point, image, network, name):
    cmd = ["docker", "run", "--rm", "-i", "--name", name]
    if not network:
        cmd += ["--network", "none"]
    if DOCKER_MEM:
        cmd += ["--memory", DOCKER_MEM]
    if DOCKER_CPUS:
        cmd += ["--cpus", DOCKER_CPUS]
    cmd += ["-v", f"{pkg_dir}:/handle:ro",
            "-v", f"{RUNNER}:/ctes_runner.py:ro",
            "-w", "/handle"]
    cmd += [image, "python", "/ctes_runner.py", "/handle", entry_point]
    return cmd


def _docker_kill(name):
    """Best-effort removal of a timed-out container."""
    subprocess.run(["docker", "rm", "-f", name], capture_output=True)


def _as_text(data):
    if data is None:
        return ""
    return data.decode("utf-8", "replace") if isinstance(data, bytes) else data


def _parse_envelope(stdout):
    """Return the result envelope from process stdout, or None.

    The shim writes the envelope as the only stdout line, but scan from the
    end anyway so stray fd-1 output can never masquerade as a result.
    """
    for line in reversed(stdout.splitlines()):
        line = line.strip()
        if not line:
            continue
        try:
            env = json.loads(line)
        except ValueError:
            continue
        if isinstance(env, dict) and "ok" in env:
            return env
    return None


def execute(pkg_dir, entry_point, payload, timeout_s, *, image=None,
            network=False, backend=None, run_id="run"):
    """Execute a handle; returns a raw outcome dict (no run-record policy).

    status: completed | failed | timed_out. ``result``/``error`` come from
    the envelope; ``stdout``/``stderr`` are the raw process streams (stdout
    is the envelope channel, stderr is the handle's log + tracebacks).
    """
    backend = (backend or default_backend()).strip().lower()
    if backend not in ("docker", "subprocess"):
        backend = default_backend()
    image = image or DOCKER_IMAGE
    stdin_text = json.dumps(payload if payload is not None else {})

    if backend == "docker":
        cmd = _docker_cmd(pkg_dir, entry_point, image, network, f"ctes-{run_id}")
    else:
        backend = "subprocess"  # normalize e.g. "auto" callers
        cmd = [sys.executable, RUNNER, pkg_dir, entry_point]

    started = time.monotonic()
    try:
        proc = subprocess.run(cmd, input=stdin_text, capture_output=True,
                              text=True, timeout=timeout_s, cwd=pkg_dir)
    except subprocess.TimeoutExpired as exc:
        if backend == "docker":
            _docker_kill(f"ctes-{run_id}")
        return {
            "status": "timed_out", "exit_code": None,
            "stdout": _as_text(exc.stdout), "stderr": _as_text(exc.stderr),
            "result": None,
            "error": f"timed out after {timeout_s}s",
            "backend": backend,
            "duration_ms": int((time.monotonic() - started) * 1000),
        }
    except OSError as exc:
        return {
            "status": "failed", "exit_code": -1, "stdout": "", "stderr": "",
            "result": None, "error": f"{backend} backend failed: {exc}",
            "backend": backend,
            "duration_ms": int((time.monotonic() - started) * 1000),
        }

    duration_ms = int((time.monotonic() - started) * 1000)
    stdout, stderr = proc.stdout or "", proc.stderr or ""
    env = _parse_envelope(stdout)
    if env is None:
        status, result = "failed", None
        error = (f"no result envelope (exit {proc.returncode}); "
                 f"stdout={stdout[:200]!r}")
    elif env.get("ok"):
        status, result, error = "completed", env.get("result"), None
    else:
        status, result = "failed", None
        error = env.get("error") or "handle error"
    return {
        "status": status, "exit_code": proc.returncode,
        "stdout": stdout, "stderr": stderr,
        "result": result, "error": error, "backend": backend,
        "duration_ms": duration_ms,
    }
