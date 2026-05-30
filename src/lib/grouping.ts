import type { Product, ShoppingItem } from "./types";

type WithCategory = {
  category?: { name?: string; sort_order?: number } | null;
};

export function categoryName(item: WithCategory & { category?: Product["category"] }) {
  return item.category?.name ?? "Otros";
}

export function categorySortOrder(item: WithCategory) {
  return item.category?.sort_order ?? 999;
}

/** Group products by category; within each group sort A→Z by name. */
export function groupProductsByCategory(products: Product[]): [string, Product[]][] {
  const map = new Map<string, Product[]>();
  for (const p of products) {
    const cat = p.category?.name ?? "Otros";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(p);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }
  return sortCategoryEntries(map);
}

/** Group shopping items by category; within each group keep add order (created_at). */
export function groupShoppingByCategory(items: ShoppingItem[]): [string, ShoppingItem[]][] {
  const map = new Map<string, ShoppingItem[]>();
  for (const s of items) {
    const cat = s.product?.category?.name ?? "Otros";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  for (const list of map.values()) {
    list.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }
  return sortCategoryEntries(map, (items) => items[0]?.product?.category?.sort_order ?? 999);
}

function sortCategoryEntries<T>(
  map: Map<string, T[]>,
  getOrder: (items: T[]) => number = (items) =>
    (items[0] as Product)?.category?.sort_order ??
    (items[0] as ShoppingItem)?.product?.category?.sort_order ??
    999,
): [string, T[]][] {
  return [...map.entries()].sort((a, b) => {
    const orderDiff = getOrder(a[1]) - getOrder(b[1]);
    if (orderDiff !== 0) return orderDiff;
    return a[0].localeCompare(b[0], "es");
  });
}

/** Flat list in natural display order (category → stable item order). */
export function flattenGrouped<T>(grouped: [string, T[]][]): T[] {
  return grouped.flatMap(([, items]) => items);
}
