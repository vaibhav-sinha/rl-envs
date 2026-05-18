#!/bin/bash
set -euo pipefail
export PYTHONUNBUFFERED=1
echo "[verifier] starting rewardkit"
rewardkit /tests
echo "[verifier] rewardkit finished"
