"""Run the collectors on your machine without Appwrite:
    GH_TOKEN=... python src/local.py > snapshot.json
"""
import json
import sys

from snapshot import build_snapshot, load_config

if __name__ == "__main__":
    print(json.dumps(build_snapshot(load_config(), log=lambda m: print(m, file=sys.stderr)), indent=1))
