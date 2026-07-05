import { TcpTransport } from './tcp-transport.js';
import { TlsTransport } from './tls-transport.js';
import type { RouterOsTransport, RouterOsTransportOptions } from './transport.types.js';

export function createTransport(options: RouterOsTransportOptions): RouterOsTransport {
  return options.tls ? new TlsTransport(options) : new TcpTransport(options);
}
