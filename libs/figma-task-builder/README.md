# figma-task-builder

HTTP backend for the Figma plugin **Task Builder** tab. Manages task drafts, coordinates HFC import, and finalizes Harbor tasks under `envs/figma-design/tasks/`.

## Run locally

```bash
# Terminal 1 — HFC (import API)
cd libs/headless-figma-clone
npm run build && npm run start

# Terminal 2 — Task Builder
cd libs/figma-task-builder
npm install
npm run dev
```

Default URL: `http://127.0.0.1:3856`

## Environment

| Variable | Default |
|----------|---------|
| `TB_HTTP_PORT` | `3856` |
| `TB_TASKS_DIR` | `envs/figma-design/task-drafts` |
| `TB_HARBOR_TASKS_DIR` | `envs/figma-design/tasks` |
| `TB_HFC_URL` | `http://127.0.0.1:3847` |
| `TB_EXPORT_DIR` | `~/.headless-figma-clone/workspace` |

## API

- `GET /health` — status and paths
- `GET /tasks` — list drafts + harbor tasks (`created_at` desc); each item includes `has_design_export`
- `POST /tasks` — `{ "name": "my-task" }` or `{ "name": "my-task", "copyFrom": "existing-harbor-id" }`
- `GET /tasks/:id` — full draft payload + check catalog
- `PATCH /tasks/:id` — update instruction, metadata, eval-spec, wizard step
- `DELETE /tasks/:id` — discard draft
- `POST /tasks/:id/export` — Figma export: `{ snapshot, mode: "full"|"exclude", excludeNodeIds? }`; copy export: `{ mode: "copy", copyFromTaskId, excludeFigmaNodeIds? }` (copies `design.hfc.json` + assets; does not copy eval-spec)
- `POST /tasks/:id/assets` — `{ filename, dataBase64 }`
- `POST /tasks/:id/complete` — finalize into `tasks/`
- `POST /export` — standalone export (Export tab)

HFC conversion uses `POST /import/hfc` (no disk write in HFC; this service persists files).

## After finalize

Register the task in the dataset if needed:

```bash
cd envs/figma-design
harbor add tasks/<task-id>
harbor sync
```
