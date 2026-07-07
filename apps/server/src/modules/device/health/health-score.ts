import {
  CPU_CRITICAL_PERCENT,
  CPU_WARNING_PERCENT,
  DISK_CRITICAL_PERCENT,
  DISK_WARNING_PERCENT,
  HEALTH_CRITICAL_PENALTY,
  HEALTH_SCORE_MAX,
  HEALTH_WARNING_PENALTY,
  MEMORY_CRITICAL_PERCENT,
  MEMORY_WARNING_PERCENT,
  TEMPERATURE_CRITICAL_CELSIUS,
  TEMPERATURE_WARNING_CELSIUS,
  VOLTAGE_HIGH_WARNING,
  VOLTAGE_LOW_WARNING,
} from './health-thresholds.js';
import type {
  HealthIssue,
  HealthReport,
  HealthStatus,
  RouterOsHealthLike,
  RouterOsResourceLike,
} from './health-types.js';

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return undefined;

  const normalized = value.replace(/[^0-9.-]/g, '');
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function usedPercent(free: unknown, total: unknown): number | undefined {
  const freeValue = toNumber(free);
  const totalValue = toNumber(total);

  if (freeValue === undefined || totalValue === undefined || totalValue <= 0) {
    return undefined;
  }

  const used = Math.max(0, totalValue - freeValue);
  return Math.round((used / totalValue) * 100);
}

function statusFromScore(score: number): HealthStatus {
  if (score >= 90) return 'healthy';
  if (score >= 60) return 'warning';
  return 'critical';
}

function penaltyFor(status: HealthStatus): number {
  if (status === 'critical') return HEALTH_CRITICAL_PENALTY;
  if (status === 'warning') return HEALTH_WARNING_PENALTY;
  return 0;
}

function addIssue(issues: HealthIssue[], issue: HealthIssue): void {
  issues.push(issue);
}

function evaluateCpu(resource: RouterOsResourceLike, issues: HealthIssue[]): void {
  const cpuLoad = toNumber(resource.cpuLoad);
  if (cpuLoad === undefined) return;

  if (cpuLoad >= CPU_CRITICAL_PERCENT) {
    addIssue(issues, {
      code: 'CPU_HIGH',
      status: 'critical',
      title: 'CPU load critical',
      message: `CPU load is ${cpuLoad}%.`,
      value: cpuLoad,
      threshold: CPU_CRITICAL_PERCENT,
      unit: '%',
      recommendation: 'Check routing, firewall, queues, scripts and high traffic load.',
    });
    return;
  }

  if (cpuLoad >= CPU_WARNING_PERCENT) {
    addIssue(issues, {
      code: 'CPU_HIGH',
      status: 'warning',
      title: 'CPU load high',
      message: `CPU load is ${cpuLoad}%.`,
      value: cpuLoad,
      threshold: CPU_WARNING_PERCENT,
      unit: '%',
      recommendation: 'Monitor CPU trend and review heavy RouterOS features.',
    });
  }
}

function evaluateMemory(resource: RouterOsResourceLike, issues: HealthIssue[]): void {
  const memoryUsed = usedPercent(resource.freeMemory, resource.totalMemory);
  if (memoryUsed === undefined) return;

  if (memoryUsed >= MEMORY_CRITICAL_PERCENT) {
    addIssue(issues, {
      code: 'MEMORY_LOW',
      status: 'critical',
      title: 'Memory usage critical',
      message: `Memory usage is ${memoryUsed}%.`,
      value: memoryUsed,
      threshold: MEMORY_CRITICAL_PERCENT,
      unit: '%',
      recommendation: 'Review services, packages and possible memory leaks.',
    });
    return;
  }

  if (memoryUsed >= MEMORY_WARNING_PERCENT) {
    addIssue(issues, {
      code: 'MEMORY_LOW',
      status: 'warning',
      title: 'Memory usage high',
      message: `Memory usage is ${memoryUsed}%.`,
      value: memoryUsed,
      threshold: MEMORY_WARNING_PERCENT,
      unit: '%',
      recommendation: 'Monitor free memory and review unnecessary services.',
    });
  }
}

function evaluateDisk(resource: RouterOsResourceLike, issues: HealthIssue[]): void {
  const diskUsed = usedPercent(resource.freeHddSpace, resource.totalHddSpace);
  if (diskUsed === undefined) return;

  if (diskUsed >= DISK_CRITICAL_PERCENT) {
    addIssue(issues, {
      code: 'DISK_LOW',
      status: 'critical',
      title: 'Disk usage critical',
      message: `Disk usage is ${diskUsed}%.`,
      value: diskUsed,
      threshold: DISK_CRITICAL_PERCENT,
      unit: '%',
      recommendation: 'Remove old backups, logs, supout files or unused packages.',
    });
    return;
  }

  if (diskUsed >= DISK_WARNING_PERCENT) {
    addIssue(issues, {
      code: 'DISK_LOW',
      status: 'warning',
      title: 'Disk usage high',
      message: `Disk usage is ${diskUsed}%.`,
      value: diskUsed,
      threshold: DISK_WARNING_PERCENT,
      unit: '%',
      recommendation: 'Clean old files and monitor disk usage.',
    });
  }
}

function healthName(row: RouterOsHealthLike): string {
  return String(row.name ?? row.type ?? '').toLowerCase();
}

function evaluateTemperature(health: RouterOsHealthLike[], issues: HealthIssue[]): void {
  for (const row of health) {
    if (!healthName(row).includes('temp')) continue;

    const temperature = toNumber(row.value);
    if (temperature === undefined) continue;

    if (temperature >= TEMPERATURE_CRITICAL_CELSIUS) {
      addIssue(issues, {
        code: 'TEMPERATURE_HIGH',
        status: 'critical',
        title: 'Temperature critical',
        message: `Temperature is ${temperature}°C.`,
        value: temperature,
        threshold: TEMPERATURE_CRITICAL_CELSIUS,
        unit: '°C',
        recommendation: 'Check airflow, ambient temperature, dust and device load.',
      });
      continue;
    }

    if (temperature >= TEMPERATURE_WARNING_CELSIUS) {
      addIssue(issues, {
        code: 'TEMPERATURE_HIGH',
        status: 'warning',
        title: 'Temperature high',
        message: `Temperature is ${temperature}°C.`,
        value: temperature,
        threshold: TEMPERATURE_WARNING_CELSIUS,
        unit: '°C',
        recommendation: 'Monitor cooling and device environment.',
      });
    }
  }
}

function evaluateVoltage(health: RouterOsHealthLike[], issues: HealthIssue[]): void {
  for (const row of health) {
    if (!healthName(row).includes('voltage')) continue;

    const voltage = toNumber(row.value);
    if (voltage === undefined) continue;

    if (voltage <= VOLTAGE_LOW_WARNING || voltage >= VOLTAGE_HIGH_WARNING) {
      addIssue(issues, {
        code: 'VOLTAGE_WARNING',
        status: 'warning',
        title: 'Voltage warning',
        message: `Voltage is ${voltage}V.`,
        value: voltage,
        unit: 'V',
        recommendation: 'Check power supply and input voltage stability.',
      });
    }
  }
}

export function calculateHealthScore(
  resource: RouterOsResourceLike = {},
  health: RouterOsHealthLike[] = [],
): HealthReport {
  const issues: HealthIssue[] = [];

  evaluateCpu(resource, issues);
  evaluateMemory(resource, issues);
  evaluateDisk(resource, issues);
  evaluateTemperature(health, issues);
  evaluateVoltage(health, issues);

  const score = Math.max(
    0,
    HEALTH_SCORE_MAX - issues.reduce((total, issue) => total + penaltyFor(issue.status), 0),
  );

  return {
    score,
    status: statusFromScore(score),
    issues,
    evaluatedAt: new Date().toISOString(),
  };
}
