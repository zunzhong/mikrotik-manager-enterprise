import net from 'node:net';
import { RouterOsSentenceParser } from '../codec/parser.js';
import { encodeSentence, type RouterOsSentence } from '../codec/sentence.js';
import { RouterOsFatalError, RouterOsTimeoutError, RouterOsTrapError } from '../protocol/errors.js';
import { parseReply, type RouterOsReply } from '../protocol/reply.js';
export interface TcpTransportOptions { host: string; port?: number; timeoutMs?: number; }
export class TcpTransport {
  private socket?: net.Socket; private readonly parser = new RouterOsSentenceParser(); private pendingReplies: RouterOsReply[] = []; private pendingResolvers: Array<()=>void> = [];
  constructor(private readonly options: TcpTransportOptions) {}
  async connect(): Promise<void> { if (this.socket) return; await new Promise<void>((resolve,reject)=>{ const socket = net.createConnection({host:this.options.host, port:this.options.port ?? 8728}); const timeout=setTimeout(()=>{socket.destroy(); reject(new RouterOsTimeoutError('RouterOS TCP connect timeout'));}, this.options.timeoutMs ?? 10000); socket.once('connect',()=>{clearTimeout(timeout); this.socket=socket; resolve();}); socket.once('error',(e)=>{clearTimeout(timeout); reject(e);}); socket.on('data',(chunk)=>{ for (const sentence of this.parser.push(chunk)) this.pendingReplies.push(parseReply(sentence)); this.flushResolvers();}); socket.on('error',()=>this.flushResolvers()); socket.on('close',()=>this.flushResolvers()); }); }
  close(): void { this.socket?.destroy(); this.socket=undefined; this.parser.reset(); this.pendingReplies=[]; this.flushResolvers(); }
  async send(sentence: RouterOsSentence): Promise<void> { if (!this.socket) throw new Error('RouterOS transport is not connected'); const payload=encodeSentence(sentence); await new Promise<void>((resolve,reject)=>{ this.socket!.write(payload,(err)=>err?reject(err):resolve()); }); }
  async readReplySet(timeoutMs = this.options.timeoutMs ?? 10000): Promise<RouterOsReply[]> { const replies: RouterOsReply[]=[]; const started=Date.now(); while (Date.now()-started < timeoutMs) { while (this.pendingReplies.length>0) { const reply=this.pendingReplies.shift()!; if (reply.type==='!trap') throw new RouterOsTrapError(reply); if (reply.type==='!fatal') throw new RouterOsFatalError(reply); if (reply.type==='!done') return replies; replies.push(reply); } await this.waitForData(Math.max(1, timeoutMs-(Date.now()-started))); } throw new RouterOsTimeoutError('RouterOS API read timeout'); }
  private waitForData(timeoutMs:number): Promise<void> { return new Promise((resolve)=>{ const timer=setTimeout(resolve, timeoutMs); this.pendingResolvers.push(()=>{clearTimeout(timer); resolve();}); }); }
  private flushResolvers(): void { const resolvers=this.pendingResolvers.splice(0); for (const r of resolvers) r(); }
}
