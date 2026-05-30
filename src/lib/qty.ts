export const QTY_MIN = 0.1;
export const QTY_MAX = 99;
export const QTY_INPUT_STEP = 0.001;
export const QTY_STEP = 0.1;
export const QTY_DECIMALS = 3;

export function clampQty(n: number): number {
  const factor = 10 ** QTY_DECIMALS;
  const rounded = Math.round(n * factor) / factor;
  return Math.min(QTY_MAX, Math.max(QTY_MIN, rounded));
}

export function clampQtyInt(n: number): number {
  const rounded = Math.round(n);
  return Math.min(QTY_MAX, Math.max(1, rounded));
}

export function formatQty(n: number): string {
  const rounded = clampQty(n);
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(QTY_DECIMALS).replace(/\.?0+$/, "");
}
