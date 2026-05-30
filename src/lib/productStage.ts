import type { LucideIcon } from "lucide-react";
import { Check, Home, ListChecks, ShoppingCart } from "lucide-react";
import type { Product, ShoppingItem, ShoppingStatus } from "./types";
import { itemStatus } from "./purchase";

export type ProductStage = "pantry" | "off_list" | ShoppingStatus;

export type CycleContext = "despensa" | "lista";

export type SemanticColor = "pantry" | "list" | "cart" | "saved";

export function resolveProductStage(
  product: Product,
  statusByProduct: Map<string, ShoppingStatus>,
): ProductStage {
  if (product.in_stock) return "pantry";
  const st = statusByProduct.get(product.id);
  if (st) return st;
  return "off_list";
}

export function buildStatusMap(shopping: ShoppingItem[]) {
  const map = new Map<string, ShoppingStatus>();
  for (const s of shopping) {
    map.set(s.product_id, itemStatus(s));
  }
  return map;
}

/** Next stage in the rotational CTA cycle. */
export function nextStage(
  current: ProductStage | ShoppingStatus,
  context: CycleContext,
): ProductStage | ShoppingStatus {
  if (context === "despensa") {
    if (current === "pantry" || current === "off_list") return "needed";
    if (current === "needed") return "in_cart";
    if (current === "in_cart" || current === "purchased") return "pantry";
    return "needed";
  }
  // Lista: ciclo completo incluyendo despensa al final
  if (current === "needed") return "in_cart";
  if (current === "in_cart") return "purchased";
  if (current === "purchased") return "pantry";
  return "needed";
}

export function stageIcon(
  stage: ProductStage | ShoppingStatus,
): LucideIcon {
  if (stage === "pantry") return Home;
  if (stage === "in_cart") return ShoppingCart;
  if (stage === "purchased") return Check;
  return ListChecks;
}

export function stageColor(
  stage: ProductStage | ShoppingStatus,
): SemanticColor {
  if (stage === "pantry") return "pantry";
  if (stage === "in_cart") return "cart";
  if (stage === "purchased") return "saved";
  return "list";
}

const STAGE_LABEL: Record<string, string> = {
  pantry: "En despensa",
  off_list: "Sin lista",
  needed: "Por comprar",
  in_cart: "En carrito",
  purchased: "Guardado",
};

const NEXT_ACTION: Record<CycleContext, Record<string, string>> = {
  despensa: {
    pantry: "Agregar a la lista",
    off_list: "Agregar a la lista",
    needed: "Mover a carrito",
    in_cart: "Marcar en despensa",
    purchased: "Marcar en despensa",
  },
  lista: {
    needed: "Mover a carrito",
    in_cart: "Marcar comprado",
    purchased: "Marcar en despensa",
    pantry: "Agregar a la lista",
  },
};

export function stageLabel(stage: ProductStage | ShoppingStatus): string {
  return STAGE_LABEL[stage] ?? "Producto";
}

export function stagesForContext(
  context: CycleContext,
): (ProductStage | ShoppingStatus)[] {
  if (context === "despensa") return ["pantry", "needed", "in_cart", "purchased"];
  return ["pantry", "needed", "in_cart", "purchased"];
}

export function cycleAriaLabel(
  stage: ProductStage | ShoppingStatus,
  context: CycleContext,
): string {
  const current = stageLabel(stage);
  const action = NEXT_ACTION[context][stage] ?? "Cambiar estado";
  return `${current}. Toca para: ${action}. Mantén presionado para elegir estado.`;
}
