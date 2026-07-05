import crypto from 'node:crypto';
import { attribute } from '../codec/sentence.js';
import { firstData, type RouterOsReply } from '../protocol/reply.js';
import { TcpTransport } from '../transport/tcp-transport.js';
export interface RouterOsClientOptions { host: string; port?: number; username: string; password: string; timeoutMs?: number; }
export interface RouterOsCommandOptions { timeoutMs?: number; }
export class RouterOsClient {
  private readonly transport: TcpTransport;
  public readonly system = { identity: () => this.printOne('/system/identity/print'), resource: () => this.printOne('/system/resource/print'), routerboard: () => this.printOne('/system/routerboard/print') };
  constructor(private readonly options: RouterOsClientOptions) { this.transport = new TcpTransport({host:options.host, port:options.port ?? 8728, timeoutMs:options.timeoutMs ?? 10000}); }
  async connect(): Promise<void> { await this.transport.connect(); await this.login(); }
  close(): void { this.transport.close(); }
  async command(path: string, attributes: Record<string,string|number|boolean> = {}, options: RouterOsCommandOptions = {}): Promise<RouterOsReply[]> { await this.transport.send([path, ...Object.entries(attributes).map(([k,v])=>attribute(k,v))]); return this.transport.readReplySet(options.timeoutMs ?? this.options.timeoutMs ?? 10000); }
  async print(path: string, attributes: Record<string,string|number|boolean> = {}): Promise<Record<string,string>[]> { const replies = await this.command(path, attributes); return replies.filter((r)=>r.type==='!re').map((r)=>r.attributes); }
  async printOne(path: string, attributes: Record<string,string|number|boolean> = {}): Promise<Record<string,string>> { return firstData(await this.command(path, attributes)); }
  private async login(): Promise<void> { await this.transport.send(['/login', attribute('name', this.options.username), attribute('password', this.options.password)]); await this.transport.readReplySet(this.options.timeoutMs ?? 10000); }
  async loginLegacy(challenge: string): Promise<void> { const challengeBuffer=Buffer.from(challenge,'hex'); const digest=crypto.createHash('md5').update(Buffer.concat([Buffer.from([0]), Buffer.from(this.options.password), challengeBuffer])).digest('hex'); await this.command('/login', {name:this.options.username, response:`00${digest}`}); }
}
