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

Default: **streamed JSON** to a temp file (no single in-memory serialization buffer for the full envelope), then `fsync` + `rename`.

```text
function save(path, envelope):
  dir = dirname(path)
  tmp = join(dir, basename(path) + ".tmp-" + randomSuffix())
  stream = createWriteStream(tmp, { encoding: 'utf8' })
  writeJsonEnvelope(stream, envelope)   // incremental; compact JSON
  stream.end()
  fsync(tmp)
  rename(tmp, path)
```

### Environment flags

| Variable | Default | Effect |
|----------|---------|--------|
| `HFC_STREAM_SAVE` | enabled | Set to `0` or `false` to use buffered `JSON.stringify` + atomic UTF-8 write instead of streaming |
| `HFC_JSON_PRETTY` | off | Set to `1` or `true` for pretty-printed JSON (`null, 2`); forces buffered save path |

Buffered fallback (when streaming is disabled or pretty mode is on):

```text
  bytes = JSON.stringify(envelope)            // compact default
  // or JSON.stringify(envelope, null, 2) when HFC_JSON_PRETTY=1
  writeFileSync(tmp, bytes, { encoding: 'utf8' })
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
