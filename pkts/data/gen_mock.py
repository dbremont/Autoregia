#!/usr/bin/env python3
"""
Deterministic mock KeystrokeEvent[] generator for PKTS, conforming to
spec/pkts/schema.json. Produces a realistic keystroke stream across several
sessions over a few days, including bursts, pauses, corrections (backspaces),
modifier/shortcut usage, and fatigue drift — so every analytical artifact has
meaningful data.

Run:  python3 pkts/data/gen_mock.py
Writes: pkts/data/mock_keystrokes.json
"""
import json, random, os, hashlib
from datetime import datetime, timezone, timedelta

random.seed(20260627)

TEXTS = [
    "the quick brown fox jumps over the lazy dog",
    "function compose(a, b) { return x => a(b(x)); }",
    "documentation is a love letter to your future self",
    "attention is the most scarce and most strategic resource",
    "return on attention exceeds return on investment when scaled",
    "const result = await fetch(url).then(r => r.json());",
    "the system observes itself and adapts in a closed loop",
    "measure what you treasure before you treasure what you measure",
    "if __name__ == '__main__': main()",
    "keystroke dynamics encode identity, fatigue, and intent",
    "git commit -m 'refactor telemetry ingestion pipeline'",
    "a record is the smallest unit of accountable reality",
]

ROWS = [
    ("` 1 2 3 4 5 6 7 8 9 0 - =".split()),
    ("q w e r t y u i o p [ ]".split()),
    ("a s d f g h j k l ; '".split()),
    ("z x c v b n m , . /".split()),
]
FINGERS = {
    "L-pinky": "`1qaz", "L-ring": "2wsx", "L-mid": "3edc", "L-index": "45rfvtgb",
    "R-index": "6yhnujm", "R-mid": "7ik,", "R-ring": "8ol.", "R-pinky": "9p;/0-=]['\\",
}
FINGER_OF = {k: f for f, ks in FINGERS.items() for k in ks}
HAND_OF = {f: "L" if f.startswith("L") else "R" for f in FINGERS}

def mk_event(events, key, key_code, t_ms, elapsed_ms, session_id,
             dwell, flight, modifiers, is_shortcut, digraph=None):
    ei = len(events)
    event_time = t_ms + int(elapsed_ms)
    dt = datetime(2026,1,1,tzinfo=timezone.utc) + timedelta(milliseconds=event_time)
    mods = list(dict.fromkeys(modifiers))
    wpm = max(5.0, min(140.0, 12000.0 / max(1.0, flight)))
    return {
        "event_id": stable_event_id(ei),
        "timestamp_utc": iso(dt),
        "local_timestamp": iso(dt + timedelta(hours=2)),
        "timezone": "Europe/Brussels",
        "session_id": session_id,
        "source": {
            "platform": random.choice(["x11","wayland","x11"]),
            "capture_scope": "application_local",
            "collector": "pkts-collector",
            "collector_version": "0.4.0",
        },
        "device": {
            "device_id": "dev-thinkpad-x1",
            "hostname": "autoregia-ws",
            "machine_type": "laptop",
            "os": {"family": "Linux", "distribution": "Debian", "version": "12"},
        },
        "keyboard": {
            "keyboard_id": "kb-integrated-us",
            "layout": "us",
            "connection_type": "integrated",
        },
        "event": {
            "event_type": "key_down",
            "key": key,
            "key_code": key_code,
            "modifiers": mods,
            "is_composition": False,
            "is_shortcut": bool(is_shortcut),
        },
        "timing": {
            "event_time_ms": event_time,
            "hold_time_ms": round(dwell, 1),
            "flight_time_ms": round(flight, 1),
            "digraph_latency_ms": round(digraph, 1) if digraph is not None else None,
            "typing_speed_wpm": round(wpm, 1),
            "session_elapsed_ms": int(elapsed_ms),
        },
        "context": {
            "language": "en",
            "task_type": "coding" if any(s in ("{","}","=",";") for s in [key]) else "writing",
            "application_name": random.choice(["Code","Firefox","Terminal","Obsidian"]),
            "input_field_type": "editor",
        },
        "environment": {
            "cpu_load_percent": round(random.uniform(8, 60), 1),
            "memory_usage_percent": round(random.uniform(40, 80), 1),
            "battery_percent": round(random.uniform(30, 95), 1),
        },
        "tags": [],
        "metadata": {"hand": HAND_OF.get(FINGER_OF.get(key, "R-index"), "R"),
                     "finger": FINGER_OF.get(key, "R-index")},
    }


def stable_event_id(i):
    return "EVT-" + hashlib.sha256(f"pkts-{i}".encode()).hexdigest()[:10].upper()

def iso(dt):
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def gen_session_events(text, session_start, session_id):
    events = []
    t_ms = int((session_start - datetime(2026,1,1,tzinfo=timezone.utc)).total_seconds()*1000)
    fatigue = 0.0
    base_dwell = 90.0
    base_flight = 130.0
    elapsed = 0
    prev_key = None
    for ch in text:
        if random.random() < 0.06 and ch != " ":
            depth = random.choice([1,1,1,2])
            for _ in range(depth):
                events.append(mk_event(events, "Backspace", "Backspace", t_ms,
                    elapsed, session_id, base_dwell+fatigue, base_flight, [], False, None))
                elapsed += events[-1]["timing"]["hold_time_ms"] + events[-1]["timing"]["flight_time_ms"]
            fatigue += 0.4

        if ch == " ":
            key, key_code, mods = "space", "Space", []
        elif ch == "\n":
            key, key_code, mods = "enter", "Enter", []
        elif ch in "(){}[]<>,.;:'\"+-=/!*":
            key, key_code, mods = ch, f"Bracket{ch}", []
            if ch.isupper():
                mods = ["shift"]
        else:
            if ch.isupper():
                key, key_code, mods = ch.lower(), f"Key{ch.upper()}", ["shift"]
            else:
                key, key_code, mods = ch, f"Key{ch.upper()}", []

        is_shortcut = False
        if ch == ";" and random.random() < 0.10:
            is_shortcut = True
            mods = mods + ["ctrl"]

        burst = 0.82 if random.random() < 0.30 else 1.0
        dwell = max(55.0, (base_dwell + fatigue) * random.uniform(0.8, 1.25) * burst)
        flight = max(40.0, (base_flight + fatigue*0.8) * random.uniform(0.7, 1.6) * burst)
        digraph = flight if (prev_key and prev_key not in ("space","enter") and key not in ("space","enter")) else None

        ev = mk_event(events, key, key_code, t_ms, elapsed, session_id,
                      dwell, flight, mods, is_shortcut, digraph)
        events.append(ev)
        elapsed += ev["timing"]["hold_time_ms"] + ev["timing"]["flight_time_ms"]
        prev_key = key

        if ch == " " and random.random() < 0.22:
            elapsed += int(random.uniform(350, 1600))

        fatigue += 0.06
        if random.random() < 0.015:
            fatigue += 8.0
    return events


def main():
    all_events = []
    sessions = []
    day = datetime(2026, 6, 23, tzinfo=timezone.utc)
    session_counter = 0
    for d in range(5):
        n_sessions = random.choice([1,2,2,3])
        for s in range(n_sessions):
            session_counter += 1
            sid = f"SES-{day.strftime('%Y%m%d')}-{session_counter:03d}"
            hour = random.choice([8,9,10,11,13,14,15,16,19,20,21,22,23])
            start = day + timedelta(hours=hour, minutes=random.randint(0,59))
            text = random.choice(TEXTS) + (" " + random.choice(TEXTS) if random.random()<0.7 else "")
            evs = gen_session_events(text, start, sid)
            all_events.extend(evs)
            sessions.append({"session_id": sid, "start": iso(start),
                             "event_count": len(evs),
                             "task_type": evs[0]["context"]["task_type"] if evs else "writing"})
        day += timedelta(days=1)
    out = {"generated_at": iso(datetime.now(timezone.utc)),
           "sessions": sessions, "events": all_events}
    path = os.path.join(os.path.dirname(__file__), "mock_keystrokes.json")
    with open(path, "w") as f:
        json.dump(out, f, indent=1)
    print(f"Wrote {len(all_events)} events across {len(sessions)} sessions -> {path}")


if __name__ == "__main__":
    main()

