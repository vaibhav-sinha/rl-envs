# Security (local service)

[← Design index](./index.md)

## Bind address

Default `127.0.0.1` per NFR-SEC-002.

## `upload_assets` (Phase 3)

- Enforce `HFC_UPLOAD_MAX_BYTES`.
- Allow-list MIME: `image/png`, `image/jpeg`, `image/gif`, `image/webp` (detect from magic bytes, not extension).
- Store under `<file>.hfc.assets/` with filename **only** the sha256 + extension; reject `..` in any user-provided name.
- Reject remote URLs in MVP (no `http://` fetch) unless explicitly added later.

## Debug routes

`/debug/*` returns `404` when `HFC_ALLOW_DEBUG` is not `1`.

## Related documents

- [HTTP host](./http-host.md)
- [Persistence](./persistence.md)
