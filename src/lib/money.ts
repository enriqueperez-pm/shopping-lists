export function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function clampPercent(n: number) {
  return Math.min(100, Math.max(0, n));
}
