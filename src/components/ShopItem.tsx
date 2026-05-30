"use client";

import { useState } from "react";
import QtyStepper from "./QtyStepper";
import StateCycleButton from "./StateCycleButton";
import SwipeableRow from "./SwipeableRow";
import EditField from "./EditField";
import ExpandDetailsButton from "./ExpandDetailsButton";
import type { ProductStage } from "@/lib/productStage";
import type { ShoppingItem, ShoppingStatus } from "@/lib/types";
import { itemStatus } from "@/lib/purchase";
import type { ActionsSide } from "@/lib/useCardLayout";
import type { ItemDensity } from "@/lib/useItemDensity";

function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function moneyPlain(n: number) {
  return n.toFixed(2);
}

function accentClass(status: ShoppingStatus) {
  if (status === "purchased") return "accent-saved";
  if (status === "in_cart") return "accent-cart";
  return "accent-list";
}

function statusBadge(status: ShoppingStatus) {
  if (status === "in_cart") {
    return { label: "Carrito", className: "text-cart bg-cart-light border border-amber-200/60" };
  }
  if (status === "purchased") {
    return { label: "Comprado", className: "text-saved bg-saved-bg border border-sky-200/60" };
  }
  return { label: "Pendiente", className: "text-list bg-[rgba(21,49,49,0.04)] border border-[var(--border-hairline)]" };
}

function ShopDetails({
  item,
  unitLabel,
  lineTotal,
  onUpdateQty,
  onUpdatePrice,
  onUpdateUnit,
  compact,
}: {
  item: ShoppingItem;
  unitLabel: string;
  lineTotal: number;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onUpdateUnit: (unit: string) => void;
  compact: boolean;
}) {
  return (
    <div
      className={`surface-inset px-2.5 py-2 flex flex-wrap items-center gap-2 ${compact ? "" : "mt-2"}`}
      data-no-swipe
    >
      <QtyStepper
        compact
        value={item.qty}
        onChange={onUpdateQty}
        label={`Cantidad de ${item.product?.name ?? "producto"}`}
        integer={unitLabel === "pz"}
      />

      <EditField
        value={item.price}
        type="number"
        format={moneyPlain}
        parse={(s) => Math.max(0, Number(s) || 0)}
        onCommit={(price) => onUpdatePrice(price as number)}
        ariaLabel="Precio"
        prefix="$"
        displayClassName={`min-w-[3.5rem] justify-center tabular-nums text-cart ${compact ? "edit-display-compact" : ""}`}
        inputClassName="w-20 text-center"
      />

      <select
        value={unitLabel}
        onChange={(e) => onUpdateUnit(e.target.value)}
        className="edit-select !min-h-[32px] text-caption"
        aria-label="Unidad"
      >
        <option value="pz">pz</option>
        <option value="kg">kg</option>
        <option value="L">L</option>
        <option value="g">g</option>
        <option value="ml">ml</option>
      </select>

      <span className="ml-auto text-sm font-semibold text-ink tabular-nums tracking-tight">
        {money(lineTotal)}
      </span>
    </div>
  );
}

export default function ShopItem({
  item,
  onCycleState,
  onSelectState,
  onUpdateQty,
  onUpdatePrice,
  onUpdateUnit,
  onRemove,
  actionsSide = "right",
  density = "expanded",
}: {
  item: ShoppingItem;
  onCycleState: () => void;
  onSelectState: (target: ShoppingStatus | ProductStage) => void;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onUpdateUnit: (unit: string) => void;
  onRemove: () => void;
  actionsSide?: ActionsSide;
  density?: ItemDensity;
}) {
  const p = item.product;
  const lineTotal = item.qty * item.price;
  const unitLabel = p?.unit ?? "pz";
  const status = itemStatus(item);
  const badge = statusBadge(status);
  const isCompact = density === "compact";
  const [detailsOpen, setDetailsOpen] = useState(false);
  const showDetails = !isCompact || detailsOpen;
  const name = p?.name ?? "—";

  const stateButton = (
    <StateCycleButton
      stage={status}
      context="lista"
      onCycle={onCycleState}
      onSelectState={onSelectState}
    />
  );

  return (
    <SwipeableRow onDelete={onRemove} onCycleState={onCycleState}>
      <article
        className={`surface-soft ${accentClass(status)} ${isCompact ? "px-2.5 py-2" : "px-3 py-2.5"}`}
        aria-label={`${name}, ${status}`}
      >
        <div className="flex items-center gap-1.5 min-h-[2rem]">
          {actionsSide === "left" && stateButton}

          <div className="flex-1 min-w-0 flex items-baseline gap-2">
            <h3
              className={`min-w-0 truncate text-title ${
                status === "purchased" ? "line-through text-ink-faint font-medium" : "font-bold"
              }`}
            >
              {name}
            </h3>
            {isCompact && !detailsOpen && (
              <span className="shrink-0 text-caption font-semibold tabular-nums text-ink-faint">
                {money(lineTotal)}
              </span>
            )}
          </div>

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
              label={name}
            />
          )}
        </div>

        {isCompact ? (
          <div className="details-panel" data-open={showDetails ? "true" : "false"}>
            {showDetails && (
              <ShopDetails
                item={item}
                unitLabel={unitLabel}
                lineTotal={lineTotal}
                onUpdateQty={onUpdateQty}
                onUpdatePrice={onUpdatePrice}
                onUpdateUnit={onUpdateUnit}
                compact={isCompact}
              />
            )}
          </div>
        ) : (
          <ShopDetails
            item={item}
            unitLabel={unitLabel}
            lineTotal={lineTotal}
            onUpdateQty={onUpdateQty}
            onUpdatePrice={onUpdatePrice}
            onUpdateUnit={onUpdateUnit}
            compact={false}
          />
        )}
      </article>
    </SwipeableRow>
  );
}
