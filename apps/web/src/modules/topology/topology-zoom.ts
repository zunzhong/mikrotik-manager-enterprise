export function wheelZoomStep(deltaY: number, ctrlKey: boolean): number | null {
  if (!ctrlKey || deltaY === 0) return null;
  return deltaY < 0 ? 0.1 : -0.1;
}
