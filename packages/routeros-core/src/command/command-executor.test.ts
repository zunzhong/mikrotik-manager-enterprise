import { describe, expect, it } from 'vitest';
import { RouterOsCommandError, RouterOsFatalError, RouterOsTimeoutError } from '../errors/routeros-error.js';
import { encodeSentence } from '../protocol/encoder.js';
import { FakeTransport } from '../testing/fake-transport.js';
import { CommandExecutor } from './command-executor.js';
import { CommandTagGenerator } from './command-tag.js';

describe('CommandTagGenerator', () => {
  it('generates incremental tags', () => {
    const generator = new CommandTagGenerator();

    expect(generator.next()).toBe('req-1');
    expect(generator.next()).toBe('req-2');
  });
});

describe('CommandExecutor', () => {
  it('collects rows until !done', async () => {
    const transport = new FakeTransport();
    const executor = new CommandExecutor(transport);

    const promise = executor.execute({
      path: '/system/resource/print',
      attributes: {
        '.proplist': 'version,uptime,cpu-load',
      },
      tag: 'test-1',
    });

    transport.pushIncoming(
      Buffer.concat([
        encodeSentence(['!re', '=version=7.15.3', '=uptime=1d', '=cpu-load=4', '.tag=test-1']),
        encodeSentence(['!done', '.tag=test-1']),
      ]),
    );

    const response = await promise;

    expect(response.tag).toBe('test-1');
    expect(response.rows).toEqual([
      {
        version: '7.15.3',
        uptime: '1d',
        'cpu-load': '4',
      },
    ]);
  });

  it('throws on !trap', async () => {
    const transport = new FakeTransport();
    const executor = new CommandExecutor(transport);

    const promise = executor.execute({
      path: '/bad/command',
      tag: 'test-2',
    });

    transport.pushIncoming(
      encodeSentence(['!trap', '=message=no such command', '=category=0', '.tag=test-2']),
    );

    await expect(promise).rejects.toBeInstanceOf(RouterOsCommandError);
  });

  it('throws on !fatal', async () => {
    const transport = new FakeTransport();
    const executor = new CommandExecutor(transport);

    const promise = executor.execute({
      path: '/system/resource/print',
      tag: 'test-3',
    });

    transport.pushIncoming(encodeSentence(['!fatal', '=message=session terminated', '.tag=test-3']));

    await expect(promise).rejects.toBeInstanceOf(RouterOsFatalError);
  });

  it('ignores replies for other tags', async () => {
    const transport = new FakeTransport();
    const executor = new CommandExecutor(transport);

    const promise = executor.execute({
      path: '/system/resource/print',
      tag: 'wanted',
    });

    transport.pushIncoming(
      Buffer.concat([
        encodeSentence(['!re', '=version=wrong', '.tag=other']),
        encodeSentence(['!re', '=version=right', '.tag=wanted']),
        encodeSentence(['!done', '.tag=wanted']),
      ]),
    );

    const response = await promise;

    expect(response.rows).toEqual([{ version: 'right' }]);
  });

  it('times out when no done reply is received', async () => {
    const transport = new FakeTransport();
    const executor = new CommandExecutor(transport);

    const promise = executor.execute({
      path: '/system/resource/print',
      tag: 'timeout',
      timeoutMs: 10,
    });

    setTimeout(() => transport.closeIncoming(), 20);

    await expect(promise).rejects.toBeInstanceOf(RouterOsTimeoutError);
  });
});
