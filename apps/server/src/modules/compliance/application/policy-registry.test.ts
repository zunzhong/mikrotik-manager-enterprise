import { describe, expect, it } from 'vitest';
import { policyEvaluators } from './policy-registry.js';
import type { InventorySectionLike } from './policy-evaluator.types.js';

function section(path: string, items: Array<Record<string, unknown>>): InventorySectionLike {
  return {
    path,
    category: 'test',
    name: path,
    itemCount: items.length,
    items: items.map((raw) => ({ raw })),
  };
}

function evaluate(key: string, sections: InventorySectionLike[]) {
  const evaluator = policyEvaluators.find((item) => item.policy.key === key);
  if (!evaluator) throw new Error(`Missing evaluator: ${key}`);
  return evaluator.evaluate({ sections: new Map(sections.map((item) => [item.path, item])) });
}

describe('enterprise compliance policies', () => {
  it('fails when SSH is broadly exposed', () => {
    const result = evaluate('services.ssh.restricted', [
      section('/ip/service/print', [{ name: 'ssh', disabled: false, address: '0.0.0.0/0' }]),
    ]);
    expect(result.status).toBe('fail');
  });

  it('passes when an enabled input drop rule exists', () => {
    const result = evaluate('firewall.input.drop-rule', [
      section('/ip/firewall/filter/print', [{ chain: 'input', action: 'drop', disabled: false }]),
    ]);
    expect(result.status).toBe('pass');
  });

  it('fails when RoMON is enabled', () => {
    const result = evaluate('system.romon.disabled', [
      section('/tool/romon/print', [{ enabled: 'true' }]),
    ]);
    expect(result.status).toBe('fail');
  });
});
