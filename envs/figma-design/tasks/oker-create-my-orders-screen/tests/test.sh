#!/bin/bash
set -euo pipefail
export PYTHONUNBUFFERED=1
echo "[verifier] starting rewardkit"
rewardkit /tests
echo "[verifier] rewardkit finished"

# Persist final design for post-trial inspection (Harbor collects /logs/artifacts/).
mkdir -p /logs/artifacts
if [ -f /data/workspace/design.hfc.json ]; then
  cp -f /data/workspace/design.hfc.json /logs/artifacts/design.hfc.json
  echo "[verifier] saved design.hfc.json to /logs/artifacts/"
fi
if [ -f /data/workspace/issues.hfc.json ]; then
  cp -f /data/workspace/issues.hfc.json /logs/artifacts/issues.hfc.json
  echo "[verifier] saved issues.hfc.json to /logs/artifacts/"
fi
