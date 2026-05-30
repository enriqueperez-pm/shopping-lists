"use client";

import { useState } from "react";
import StateCycleButton from "./StateCycleButton";
import SwipeableRow from "./SwipeableRow";
import EditField from "./EditField";
import ExpandDetailsButton from "./ExpandDetailsButton";
import type { Product } from "@/lib/types";
import type { ProductStage } from "@/lib/productStage";
import type { ActionsSide } from "@/lib/useCardLayout";
import type { ItemDensity } from "@/lib/useItemDensity";
import { clampQty, formatQty, QTY_MIN } from "@/lib/qty";

function accentClass(stage: ProductStage) {
  if (stage === "pantry") return "accent-pantry";
  if (stage === "in_cart") return "accent-cart";
  if (stage === "purchased") return "accent-saved";
  if (stage === "needed") return "accent-list";
  return "accent-none";
}

function stageBadge(stage: ProductStage) {
  if (stage === "pantry") {
    return { label: "Despensa", className: "text-pantry bg-pantry-light border border-emerald-200/60" };
  }
  if (stage === "in_cart") {
    return { label: "Carrito", className: "text-cart bg-cart-light border border-amber-200/60" };
  }
  if (stage === "purchased") {
    return { label: "Comprado", className: "text-saved bg-saved-bg border border-sky-200/60" };
  }
  if (stage === "off_list") {
    return { label: "Sin lista", className: "text-ink-muted bg-[rgba(21,49,49,0.04)] border border-[var(--border-hairline)]" };
  }
  return { label: "Pendiente", className: "text-list bg-[rgba(21,49,49,0.04)] border border-[var(--border-hairline)]" };
}

function money(n: number) {
  return n.toFixed(2);
}

function ProductDetails({
  product,
  onUpdate,
  compact,
}: {
  product: Product;
  onUpdate: (updates: Partial<Product>) => void;
  compact: boolean;
}) {
  const p = product;
  return (
    <div
      className={`surface-inset px-2.5 py-2 flex flex-wrap items-center gap-2 ${compact ? "" : "mt-2"}`}
      data-no-swipe
    >
      <EditField
        value={p.ref_qty}
        type="number"
        format={formatQty}
        parse={(s) => clampQty(Number(s) || QTY_MIN)}
        onCommit={(qty) => onUpdate({ ref_qty: qty as number })}
        ariaLabel="Cantidad"
        displayClassName={`min-w-[2.25rem] justify-center tabular-nums ${compact ? "edit-display-compact" : ""}`}
        inputClassName="w-16 text-center"
      />
      <span className="text-ink-faint/50 hidden sm:inline text-caption">·</span>
      <EditField
        value={p.ref_price}
        type="number"
        format={money}
        parse={(s) => Math.max(0, Number(s) || 0)}
        onCommit={(price) => onUpdate({ ref_price: price as number })}
        ariaLabel="Precio"
        prefix="$"
        displayClassName={`min-w-[3.5rem] justify-center tabular-nums text-cart ${compact ? "edit-display-compact" : ""}`}
        inputClassName="w-20 text-center"
      />
      <span className="text-ink-faint/50 hidden sm:inline text-caption">·</span>
      <select
        value={p.unit}
        onChange={(e) => onUpdate({ unit: e.target.value })}
        className="edit-select !min-h-[32px] text-caption"
        aria-label="Unidad"
      >
        <option value="pz">pz</option>
        <option value="kg">kg</option>
        <option value="L">L</option>
        <option value="g">g</option>
        <option value="ml">ml</option>
      </select>
    </div>
  );
}

export default function ProductCard({
  product,
  stage,
  onCycleState,
  onSelectState,
  onUpdate,
  onDelete,
  actionsSide = "right",
  density = "expanded",
}: {
  product: Product;
  stage: ProductStage;
  onCycleState: () => void;
  onSelectState: (target: ProductStage) => void;
  onUpdate: (updates: Partial<Product>) => void;
  onDelete: () => void;
  actionsSide?: ActionsSide;
  density?: ItemDensity;
}) {
  const p = product;
  const badge = stageBadge(stage);
  const isCompact = density === "compact";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showDetails = !isCompact || detailsOpen;

  const stateButton = (
    <StateCycleButton
      stage={stage}
      context="despensa"
      onCycle={onCycleState}
      onSelectState={onSelectState}
    />
  );

  return (
    <SwipeableRow onDelete={onDelete} onCycleState={onCycleState}>
      <article
        className={`surface-soft ${accentClass(stage)} ${isCompact ? "px-2.5 py-2" : "px-3 py-2.5"}`}
        aria-label={`${p.name}, ${stage}`}
      >
        <div className="flex items-center gap-1.5 min-h-[2rem]">
          {actionsSide === "left" && stateButton}

          <EditField
            value={p.name}
            type="text"
            onCommit={(name) => onUpdate({ name: String(name) })}
            ariaLabel="Nombre del producto"
            displayClassName={`flex-1 min-w-0 text-left text-ink justify-start truncate text-product-name ${
              isCompact ? "edit-display-compact !min-h-[2rem]" : ""
            }`}
            inputClassName="flex-1 min-w-0 text-product-name font-medium"
            className="flex-1 min-w-0"
          />

          {!isCompact && (
            <span className={`badge-mini ${badge.className}`} aria-label={`Estado: ${badge.label}`}>
              {badge.label}
            </span>
          )}

          {actionsSide === "right" && stateButton}

          {isCompact && (
            <ExpandDetailsButton
              open={detailsOpen}
              onToggle={() => setDetailsOpen((v) => !v)}
              label={p.name}
            />
          )}
        </div>

        {isCompact ? (
          <div className="details-panel" data-open={showDetails ? "true" : "false"}>
            {showDetails && (
              <ProductDetails product={p} onUpdate={onUpdate} compact={isCompact} />
            )}
          </div>
        ) : (
          <ProductDetails product={p} onUpdate={onUpdate} compact={false} />
        )}
      </article>
    </SwipeableRow>
  );
}
