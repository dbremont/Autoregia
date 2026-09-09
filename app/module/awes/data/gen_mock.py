#!/usr/bin/env python3
"""Deterministic mock data generator for AWES."""
import json
import sys
import os

DATA_DIR = os.path.dirname(os.path.abspath(__file__))

environments = [
    {
        "env_id": "ENV-SHELL-001",
        "name": "Shell",
        "env_type": "shell",
        "status": "ready",
        "runtime": "bash",
        "capabilities": ["posix", "coreutils"],
        "config": {"timeout_s": 60},
        "created_at": "2026-07-01T00:00:00Z",
    },
    {
        "env_id": "ENV-PYTHON-001",
        "name": "Python 3.x",
        "env_type": "python",
        "status": "ready",
        "runtime": sys.executable,
        "capabilities": ["stdlib"],
        "config": {"timeout_s": 120},
        "created_at": "2026-07-01T00:00:00Z",
    },
]

with open(os.path.join(DATA_DIR, "mock_environments.json"), "w") as f:
    json.dump(environments, f, indent=2)
    f.write("\n")

print("Generated mock_environments.json")
