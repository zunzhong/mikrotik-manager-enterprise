import type { RouterOsReply } from './reply.js';
export class RouterOsTrapError extends Error { constructor(public readonly reply: RouterOsReply) { super(reply.attributes.message ?? 'RouterOS API trap'); this.name='RouterOsTrapError'; } }
export class RouterOsFatalError extends Error { constructor(public readonly reply: RouterOsReply) { super(reply.attributes.message ?? 'RouterOS API fatal error'); this.name='RouterOsFatalError'; } }
export class RouterOsTimeoutError extends Error { constructor(message='RouterOS API timeout') { super(message); this.name='RouterOsTimeoutError'; } }
