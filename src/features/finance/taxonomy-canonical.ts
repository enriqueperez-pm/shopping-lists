import { BASELINE_TAXONOMY_SEED } from "./taxonomy-seed.generated";

export type TaxonomyType = "income" | "expense";

export interface CanonicalPair {
  category: string;
  subcategory: string;
}

/** Legacy English/Spanish pairs → canonical Spanish taxonomy. */
export const LEGACY_PAIR_MAP: Record<string, [string, string]> = {
  "Housing|Rent": ["Vivienda", "Renta"],
  "Housing|Electricity": ["Vivienda", "Luz"],
  "Housing|Utilities": ["Vivienda", "Agua"],
  "Housing|Gas": ["Vivienda", "Gas doméstico"],
  "Housing|Maintenance": ["Vivienda", "Mantenimiento"],
  "Housing|Internet": ["Vivienda", "Internet"],
  "Home|Renta": ["Vivienda", "Renta"],
  "Technology|Telmex": ["Vivienda", "Internet"],
  "Technology|Phone": ["Vivienda", "Teléfono móvil"],
  "Technology|Subscriptions": ["Tecnología", "Suscripciones"],
  "Technology|Software": ["Tecnología", "Software"],
  "Technology|Devices": ["Tecnología", "Dispositivos"],
  "Transport|Car": ["Transporte", "Auto"],
  "Transport|Gas": ["Transporte", "Gasolina"],
  "Transport|Uber/Taxi": ["Transporte", "Uber/Taxi"],
  "Transport|Public Transit": ["Transporte", "Transporte público"],
  "Transport|Parking": ["Transporte", "Estacionamiento"],
  "Food|Groceries": ["Alimentación", "Supermercado"],
  "Food|Delivery": ["Alimentación", "Delivery"],
  "Food|Comida Brunas": ["Mascotas", "Comida Runa"],
  "Food|Restaurants": ["Entretenimiento", "Salidas"],
  "Food|Coffee": ["Alimentación", "Café"],
  "Alimentación|Despensa": ["Alimentación", "Supermercado"],
  "Alimentación|Restaurantes": ["Entretenimiento", "Salidas"],
  "Health|Pharmacy": ["Salud", "Farmacia"],
  "Health|Gym": ["Salud", "Gym"],
  "Health|Doctor": ["Salud", "Doctor"],
  "Health|Insurance": ["Salud", "Seguro"],
  "Entertainment|Outings": ["Entretenimiento", "Salidas"],
  "Entertainment|Streaming": ["Tecnología", "Suscripciones"],
  "Entretenimiento|Streaming": ["Tecnología", "Suscripciones"],
  "Entertainment|Events": ["Entretenimiento", "Salidas"],
  "Entertainment|Games": ["Entretenimiento", "Salidas"],
  "Financial Services|Taxes": ["Servicios financieros", "Impuestos"],
  "Financial Services|Debt Payment": ["Servicios financieros", "Pago de deuda"],
  "Financial Services|Commissions": ["Servicios financieros", "Comisiones"],
  "Personal|Miscellaneous": ["Personal", "Misceláneos"],
  "Personal|Clothing": ["Personal", "Ropa"],
  "Personal|Grooming": ["Personal", "Aseo personal"],
  "Personal|Gifts": ["Personal", "Regalos"],
  "Pets|Other": ["Mascotas", "Paseos"],
  "Pets|Food": ["Mascotas", "Comida Runa"],
  "Pets|Vet": ["Mascotas", "Veterinario"],
  "Pets|Grooming": ["Mascotas", "Aseo"],
  "Savings|Goals": ["Ahorro", "Metas"],
  "Savings|Emergency Fund": ["Ahorro", "Fondo de emergencia"],
  "Work|Tools": ["Trabajo", "Herramientas"],
  "Work|Education": ["Trabajo", "Educación"],
  "Work|Office Supplies": ["Trabajo", "Oficina"],
  "Other|Miscellaneous": ["Otros", "Misceláneos"],
  "Salary|Main Job": ["Ingresos", "Nómina"],
  "Salary|": ["Ingresos", "Nómina"],
  "Freelance|Projects": ["Ingresos", "Freelance"],
};

const normalize = (value: string) => value.trim().toLowerCase();

const canonicalSet = new Set(
  BASELINE_TAXONOMY_SEED.map(
    (row) => `${row.type}|${normalize(row.category)}|${normalize(row.subcategory)}`,
  ),
);

function pairKey(type: TaxonomyType, category: string, subcategory: string): string {
  return `${type}|${normalize(category)}|${normalize(subcategory)}`;
}

export function isCanonicalPair(
  type: TaxonomyType,
  category: string,
  subcategory: string,
): boolean {
  return canonicalSet.has(pairKey(type, category, subcategory || ""));
}

export function resolveCanonicalPair(
  type: TaxonomyType,
  category: string,
  subcategory: string,
): CanonicalPair | null {
  const sub = subcategory?.trim() || "";
  const cat = category?.trim() || "";
  if (!cat) return null;

  if (isCanonicalPair(type, cat, sub)) {
    const row = BASELINE_TAXONOMY_SEED.find(
      (r) =>
        r.type === type &&
        normalize(r.category) === normalize(cat) &&
        normalize(r.subcategory) === normalize(sub),
    );
    return row ? { category: row.category, subcategory: row.subcategory } : { category: cat, subcategory: sub };
  }

  const legacy = LEGACY_PAIR_MAP[`${cat}|${sub}`];
  if (legacy && isCanonicalPair(type, legacy[0], legacy[1])) {
    return { category: legacy[0], subcategory: legacy[1] };
  }

  return null;
}

export function getCanonicalCategories(type: TaxonomyType): string[] {
  return [
    ...new Set(BASELINE_TAXONOMY_SEED.filter((row) => row.type === type).map((row) => row.category)),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

export function getCanonicalSubcategories(type: TaxonomyType, category: string): string[] {
  const categoryLower = normalize(category);
  return [
    ...new Set(
      BASELINE_TAXONOMY_SEED.filter(
        (row) => row.type === type && normalize(row.category) === categoryLower,
      ).map((row) => row.subcategory),
    ),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

export function buildCategoriesTreeFromSeed(): Array<{
  id: string;
  name: string;
  type: TaxonomyType;
  parentId?: string;
  isActive: boolean;
  createdAt: string;
}> {
  const ts = new Date().toISOString();
  const nodes: Array<{
    id: string;
    name: string;
    type: TaxonomyType;
    parentId?: string;
    isActive: boolean;
    createdAt: string;
  }> = [];
  const parentIds = new Map<string, string>();

  for (const type of ["expense", "income"] as const) {
    for (const cat of getCanonicalCategories(type)) {
      const key = `${type}::${normalize(cat)}`;
      if (!parentIds.has(key)) {
        const id = `cat_${type}_${normalize(cat).replace(/\s+/g, "_")}`;
        parentIds.set(key, id);
        nodes.push({ id, name: cat, type, isActive: true, createdAt: ts });
      }
      const parentId = parentIds.get(key)!;
      for (const sub of getCanonicalSubcategories(type, cat)) {
        nodes.push({
          id: `cat_${type}_${normalize(cat).replace(/\s+/g, "_")}_${normalize(sub).replace(/\s+/g, "_")}`,
          name: sub,
          type,
          parentId,
          isActive: true,
          createdAt: ts,
        });
      }
    }
  }

  return nodes;
}
