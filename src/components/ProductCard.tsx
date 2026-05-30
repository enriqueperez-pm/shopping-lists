"use client";

import StateCycleButton from "./StateCycleButton";
import SwipeableRow from "./SwipeableRow";
import EditField from "./EditField";
import type { Product } from "@/lib/types";
import type { ProductStage } from "@/lib/productStage";
import type { ActionsSide } from "@/lib/useCardLayout";
import { clampQty, formatQty, QTY_MIN } from "@/lib/qty";

function accentClass(stage: ProductStage) {
  if (stage === "pantry") return "border-l-pantry";
  if (stage === "in_cart") return "border-l-cart";
  if (stage === "purchased") return "border-l-saved";
  if (stage === "needed") return "border-l-list";
  return "border-l-transparent";
}

function stageBadge(stage: ProductStage) {
  if (stage === "pantry") {
    return {
      label: "Despensa",
      className: "text-pantry bg-pantry-light border border-emerald-200",
    };
  }
  if (stage === "in_cart") {
    return {
      label: "Carrito",
      className: "text-cart bg-amber-50 border border-amber-200",
    };
  }
  if (stage === "purchased") {
    return {
      label: "Comprado",
      className: "text-saved bg-saved-bg border border-sky-200",
    };
  }
  if (stage === "off_list") {
    return {
      label: "Sin lista",
      className: "text-ink-muted bg-slate-100 border border-slate-200",
    };
  }
  return {
    label: "Pendiente",
    className: "text-list bg-slate-100 border border-slate-200",
  };
}

function money(n: number) {
  return n.toFixed(2);
}

export default function ProductCard({
  product,
  stage,
  onCycleState,
  onSelectState,
  onUpdate,
  onDelete,
  actionsSide = "right",
}: {
  product: Product;
  stage: ProductStage;
  onCycleState: () => void;
  onSelectState: (target: ProductStage) => void;
  onUpdate: (updates: Partial<Product>) => void;
  onDelete: () => void;
  actionsSide?: ActionsSide;
}) {
  const p = product;
  const badge = stageBadge(stage);

  return (
    <SwipeableRow onDelete={onDelete} onCycleState={onCycleState}>
      <article
        className={`surface rounded-lg border-l-[3px] ${accentClass(stage)} px-3 py-2.5`}
        aria-label={`${p.name}, ${stage}`}
      >
        <div className="flex items-center gap-2">
          {actionsSide === "left" && (
            <StateCycleButton
              stage={stage}
              context="despensa"
              onCycle={onCycleState}
              onSelectState={onSelectState}
            />
          )}
          <EditField
            value={p.name}
            type="text"
            onCommit={(name) => onUpdate({ name: String(name) })}
            ariaLabel="Nombre del producto"
            displayClassName="flex-1 min-w-0 text-left text-base font-semibold text-ink justify-start truncate"
            inputClassName="flex-1 min-w-0 text-base font-semibold"
            className="flex-1 min-w-0"
          />
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] leading-none font-semibold ${badge.className}`}
            aria-label={`Estado: ${badge.label}`}
          >
            {badge.label}
          </span>
          {actionsSide === "right" && (
            <StateCycleButton
              stage={stage}
              context="despensa"
              onCycle={onCycleState}
              onSelectState={onSelectState}
            />
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-2 mt-2.5 text-sm text-ink-muted font-medium"
          data-no-swipe
        >
          <EditField
            value={p.ref_qty}
            type="number"
            format={formatQty}
            parse={(s) => clampQty(Number(s) || QTY_MIN)}
            onCommit={(qty) => onUpdate({ ref_qty: qty as number })}
            ariaLabel="Cantidad"
            displayClassName="min-w-[2.5rem] justify-center tabular-nums"
            inputClassName="w-16 text-center"
          />
          <span className="text-ink-faint hidden sm:inline">·</span>
          <EditField
            value={p.ref_price}
            type="number"
            format={money}
            parse={(s) => Math.max(0, Number(s) || 0)}
            onCommit={(price) => onUpdate({ ref_price: price as number })}
            ariaLabel="Precio"
            prefix="$"
            displayClassName="min-w-[4rem] justify-center tabular-nums text-cart"
            inputClassName="w-20 text-center"
          />
          <span className="text-ink-faint hidden sm:inline">·</span>
          <select
            value={p.unit}
            onChange={(e) => onUpdate({ unit: e.target.value })}
            className="edit-select min-w-[3rem] text-center"
            aria-label="Unidad"
          >
            <option value="pz">pz</option>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>
        </div>
      </article>
    </SwipeableRow>
  );
}

