# Non-functional requirements

[← PRD index](./index.md)

## Performance

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| NFR-PERF-001 | Should | 1 | Cold start excluding browser download completes within a defined target on a reference machine (set during implementation). |
| NFR-PERF-002 | Should | 1 | `get_screenshot` for a single medium frame completes within a **timeout** suitable for MCP clients (configurable; default e.g. 30s). |
| NFR-PERF-003 | Should | 4 | Auto layout compilation stays **linear** in node count for typical files (avoid O(n²) deep recursion without memoization). |

## Reliability and durability

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| NFR-REL-001 | Must | 1 | Crash during save must not leave the primary JSON file truncated; use atomic replace. |
| NFR-REL-002 | Should | 2 | Corrupted JSON load produces a clear error with file path and parse location. |

## Observability

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| NFR-OBS-001 | Should | 2 | Log MCP tool name, duration, and success/failure (no secrets). |
| NFR-OBS-002 | Could | 3 | Optional debug dump of last compiled HTML/CSS path for support. |

## Security (local service)

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| NFR-SEC-001 | Must | 3 | **`upload_assets`**: enforce max bytes and allowed MIME types; reject path traversal in filenames. |
| NFR-SEC-002 | Should | 1 | Default HTTP bind to **127.0.0.1** unless explicitly configured otherwise. |

## Testing

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| NFR-TEST-001 | Must | 1 | Automated tests cover: save/load round-trip, `use_figma` create frame + style, `get_metadata` shape, `get_design_context` non-empty output. |
| NFR-TEST-002 | Should | 1 | Playwright screenshot test with **threshold** image comparison or snapshot of PNG hash. |
| NFR-TEST-003 | Should | 5 | **`search_design_system`** tests with fixtures for **text** matching; add **semantic** search fixtures when that mode ships. |

## Compatibility

| ID | Priority | Phase | Requirement |
|----|----------|-------|-------------|
| NFR-COMPAT-001 | Must | 1 | Pin **Node** and **SDK** versions in package metadata; document supported versions. |
| NFR-COMPAT-002 | Should | 1 | JSON `schemaVersion` field for forward migration ([document model](./document-model.md)). |

## Related documents

- [Technical architecture](./technical-architecture.md)
- [Functional requirements](./functional-requirements.md)
