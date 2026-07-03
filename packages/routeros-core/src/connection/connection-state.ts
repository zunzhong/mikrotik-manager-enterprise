export const ConnectionState = {
  Idle: 'idle',
  Connecting: 'connecting',
  Connected: 'connected',
  Authenticating: 'authenticating',
  Authenticated: 'authenticated',
  Closing: 'closing',
  Closed: 'closed',
  Error: 'error',
} as const;

export type ConnectionState = (typeof ConnectionState)[keyof typeof ConnectionState];

export function isActiveConnectionState(state: ConnectionState): boolean {
  return (
    state === ConnectionState.Connecting ||
    state === ConnectionState.Connected ||
    state === ConnectionState.Authenticating ||
    state === ConnectionState.Authenticated
  );
}
