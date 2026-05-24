# ATIF Viewer

Vanilla JS web app for viewing Harbor ATIF agent trajectory files (`trajectory.json`) in a readable chat-style timeline.

## Run locally

```powershell
cd libs/atif-viewer
npm start
```

Open http://127.0.0.1:4174 and choose a trajectory file.

Optional port override:

```powershell
node server.mjs --port 8080
```

## Features

- File picker on launch (drag-and-drop supported)
- User and agent messages as chat bubbles
- Collapsible, muted reasoning/thought blocks
- Tool calls with scrollable JSON arguments and results
- Inline image preview when a tool returns image content (e.g. `get_screenshot`)

## Format

Expects ATIF trajectory JSON with a top-level `steps` array. Compatible with files produced by Harbor agent runs under `jobs/*/agent/trajectory.json`.
