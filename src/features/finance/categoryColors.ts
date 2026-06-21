/** FLUJO category color mapping for charts and badges (klagi brain taxonomy). */

export const FLUJO_COLORS = {
  deep: "#1A2238",
  mint: "#00E676",
  lavender: "#7C4DFF",
  gold: "#D4AF37",
  sapphire: "#20B2AA",
  muted: "#718096",
} as const;

const CATEGORY_MAP: Record<string, string> = {
  vivienda: FLUJO_COLORS.deep,
  tecnología: FLUJO_COLORS.lavender,
  tecnologia: FLUJO_COLORS.lavender,
  alimentación: FLUJO_COLORS.sapphire,
  alimentacion: FLUJO_COLORS.sapphire,
  transporte: "#148F8A",
  mascotas: FLUJO_COLORS.sapphire,
  personal: FLUJO_COLORS.muted,
  otros: FLUJO_COLORS.muted,
  ingresos: FLUJO_COLORS.mint,
  "servicios financieros": FLUJO_COLORS.deep,
};

export function getCategoryColor(category: string): string {
  const key = category.trim().toLowerCase();
  if (CATEGORY_MAP[key]) return CATEGORY_MAP[key];
  for (const [prefix, color] of Object.entries(CATEGORY_MAP)) {
    if (key.includes(prefix)) return color;
  }
  return FLUJO_COLORS.sapphire;
}

export function getCategoryColorWithFallback(category: string, index: number): string {
  const palette = [
    FLUJO_COLORS.sapphire,
    FLUJO_COLORS.lavender,
    FLUJO_COLORS.deep,
    FLUJO_COLORS.gold,
    FLUJO_COLORS.mint,
  ];
  return getCategoryColor(category) || palette[index % palette.length];
}
