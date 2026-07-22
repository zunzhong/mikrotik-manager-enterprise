import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url));

function read(relativePath: string): string {
  return readFileSync(`${repositoryRoot}${relativePath}`, 'utf8');
}

describe('Topology interaction assets', () => {
  it('requires Ctrl for wheel zoom and keeps the visible controls', () => {
    const topology = read('apps/web/src/modules/topology/components/TopologyView.tsx');
    const zoom = read('apps/web/src/modules/topology/topology-zoom.ts');

    expect(zoom).toContain('if (!ctrlKey || deltaY === 0) return null');
    expect(topology).toContain('wheelZoomStep(event.deltaY, event.ctrlKey)');
    expect(topology).toContain('giữ Ctrl và lăn chuột để zoom');
    expect(topology).toContain("title={tr('Thu nhỏ', 'Zoom out')}");
    expect(topology).toContain("title={tr('Phóng to', 'Zoom in')}");
  });
});
