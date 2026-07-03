export class RouterOsError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'RouterOsError';
    this.code = code;
  }
}

export class RouterOsTimeoutError extends RouterOsError {
  constructor(message = 'RouterOS operation timed out') {
    super('ROUTEROS_TIMEOUT', message);
    this.name = 'RouterOsTimeoutError';
  }
}

export class RouterOsProtocolError extends RouterOsError {
  constructor(message: string) {
    super('ROUTEROS_PROTOCOL_ERROR', message);
    this.name = 'RouterOsProtocolError';
  }
}

export class RouterOsConnectionError extends RouterOsError {
  constructor(message: string) {
    super('ROUTEROS_CONNECTION_ERROR', message);
    this.name = 'RouterOsConnectionError';
  }
}

export class RouterOsAuthError extends RouterOsError {
  constructor(message = 'RouterOS authentication failed') {
    super('ROUTEROS_AUTH_FAILED', message);
    this.name = 'RouterOsAuthError';
  }
}
