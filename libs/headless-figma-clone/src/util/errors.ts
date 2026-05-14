export class PersistenceError extends Error {
  readonly code = 'PERSISTENCE_ERROR' as const;
  constructor(
    message: string,
    readonly path: string,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PersistenceError';
  }
}
