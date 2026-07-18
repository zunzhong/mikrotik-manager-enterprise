import { describe, expect, it } from 'vitest';
import { buildPeriodicReport } from './report.service.js';

describe('buildPeriodicReport', () => {
  it('puts RouterOS identity first and omits excluded report sections', () => {
    const report = buildPeriodicReport({
      identity: 'CORE-RTR-01',
      score: 96,
      cpu: 18,
      ram: 32.5,
      temperature: 46,
      intervalMinutes: 60,
      interfaceTotals: [
        { name: 'ether1', txBytes: 2 * 1024 ** 3, rxBytes: 8 * 1024 ** 3 },
        { name: 'sfp1', txBytes: 512 * 1024 ** 2, rxBytes: 2 * 1024 ** 3 },
      ],
      accumulatedBytes: 5 * 1024 ** 4,
      language: 'vi',
      timeZone: 'Asia/Ho_Chi_Minh',
      createdAt: new Date('2026-07-18T03:00:00.000Z'),
    });

    expect(report.split('\n')[0]).toBe('🏷️ Identity: CORE-RTR-01');
    expect(report).toContain('🏆 ĐIỂM HIỆU SUẤT: 96 / 100');
    expect(report).toContain('🌡️ Sức khỏe: CPU: 18% | RAM: 32.5% | Temp: 46°C');
    expect(report).toContain('📈 Lưu lượng tiêu thụ trong 1h (TX/RX):');
    expect(report).toContain('🟢 ether1: 2.00 GB / 8.00 GB');
    expect(report).not.toContain('ether1: TX');
    expect(report).not.toContain('ether1: RX');
    expect(report).toContain('💰 Tổng data tích lũy: 5.00 TB');
    expect(report).not.toContain('Tình trạng WAN');
    expect(report).not.toContain('Trùng lặp IP');
    expect(report).not.toContain('Excel');
    expect(report).not.toContain('Chi tiết');
  });
});
