import { describe, expect, it } from 'vitest';
import { calculateHealthScore } from './health-score.js';

describe('calculateHealthScore', () => {
  it('reports exact values and thresholds for resource warnings', () => {
    const report = calculateHealthScore({
      cpuLoad: '75',
      freeMemory: '10',
      totalMemory: '100',
      freeHddSpace: '5',
      totalHddSpace: '100',
    });

    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'CPU_HIGH', value: 75, threshold: 70 }),
        expect.objectContaining({ code: 'MEMORY_LOW', value: 90, threshold: 90 }),
        expect.objectContaining({ code: 'DISK_LOW', value: 95, threshold: 90 }),
      ]),
    );
  });

  it('supports RouterOS health records that expose sensor names as fields', () => {
    const report = calculateHealthScore({}, [{ temperature: '57', voltage: '24.1' }]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'TEMPERATURE_HIGH', value: 57, threshold: 55 }),
      ]),
    );
  });
});
