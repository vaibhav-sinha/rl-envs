# Trajectory utilities

Scripts for analyzing Harbor ATIF `trajectory.json` files from Figma agent runs.

## Scripts

| Script | Purpose |
|--------|---------|
| `lib.py` | Shared parsing helpers (import only) |
| `traj_summary.py` | Per-step overview (messages, tools, issues) |
| `traj_errors.py` | API errors and warnings only |
| `traj_tools.py` | Dump `use_figma` code + results for one step |
| `traj_verifier.py` | Correlate trajectory errors with verifier output |

## Examples

```powershell
python scripts/trajectory/traj_summary.py jobs/2026-05-22__23-42-29/oker-create-max-otp-screen__Acm9Wwn/agent/trajectory.json

python scripts/trajectory/traj_errors.py jobs/2026-05-22__23-42-29/oker-create-max-otp-screen__Acm9Wwn/agent/trajectory.json

python scripts/trajectory/traj_tools.py jobs/.../agent/trajectory.json --step 11

python scripts/trajectory/traj_verifier.py jobs/2026-05-22__23-42-29/oker-create-max-otp-screen__Acm9Wwn
```

Run from the repo root. All scripts support `--json` for machine-readable output.
