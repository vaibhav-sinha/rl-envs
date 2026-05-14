export type EngineErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_NODE'
  | 'UNSUPPORTED_OPERATION'
  | 'UNSUPPORTED_PROPERTY'
  | 'NO_ACTIVE_FILE'
  | 'CONSTRAINT_VIOLATION';

export class ValidationErr extends Error {
  constructor(
    readonly code: EngineErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'ValidationErr';
  }
}

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
