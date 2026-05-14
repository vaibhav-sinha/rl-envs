# Persistence

[← Design index](./index.md)

## `PersistenceService` interface

```typescript
export interface PersistenceService {
  /** Atomic write: temp file in same directory + fs.rename */
  save(params: { path: string; envelope: FileEnvelope }): Promise<void>;
  load(params: { path: string }): Promise<FileEnvelope>;
}
```

## Atomic write algorithm (normative)

```text
function save(path, envelope):
  dir = dirname(path)
  tmp = join(dir, basename(path) + ".tmp-" + randomSuffix())
  bytes = JSON.stringify(envelope, null, 2)   // UTF-8
  writeFileSync(tmp, bytes, { encoding: 'utf8' })
  fsync(tmp)                                   // Must fsync before rename (Node: open fd fsync)
  rename(tmp, path)                            // atomic on same volume
```

If `rename` fails, **must** attempt `unlink(tmp)` best-effort and surface original error.

## `schemaVersion` policy

- Current code supports `schemaVersion === N` only (single version per release tag).
- On load: if `schemaVersion < N`, run ordered migrations `m_{k}->m_{k+1}`; if `schemaVersion > N`, fail with `NEWER_FILE_VERSION`.

## Corruption handling

- JSON parse errors: throw `PersistenceError` with `path`, `line/column` if available (NFR-REL-002).
- Validation errors post-parse: same, include `schemaVersion`.

## Sidecar assets (Phase 3+)

Directory layout for a file `design.hfc.json`:

```text
design.hfc.json
design.hfc.assets/
  <sha256>.<ext>
```

`AssetRecord.relativePath` points under `design.hfc.assets/`.

## Related documents

- [Data model](./data-model.md)
- [Security](./security.md)
