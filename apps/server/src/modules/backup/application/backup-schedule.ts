export function nextScheduledRun(
  scheduledTime: string,
  intervalHours: number,
  from = new Date(),
): Date {
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const candidate = new Date(from);
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate.getTime() > from.getTime()) return candidate;

  const intervalMs = intervalHours * 60 * 60 * 1000;
  const jumps = Math.floor((from.getTime() - candidate.getTime()) / intervalMs) + 1;
  return new Date(candidate.getTime() + jumps * intervalMs);
}
