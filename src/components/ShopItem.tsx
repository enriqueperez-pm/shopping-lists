"use client";

import QtyStepper from "./QtyStepper";
import StateCycleButton from "./StateCycleButton";
import SwipeableRow from "./SwipeableRow";
import EditField from "./EditField";
import type { ProductStage } from "@/lib/productStage";
import type { ShoppingItem, ShoppingStatus } from "@/lib/types";
import { itemStatus } from "@/lib/purchase";
import type { ActionsSide } from "@/lib/useCardLayout";

function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function moneyPlain(n: number) {
  return n.toFixed(2);
}

function accentClass(status: ShoppingStatus) {
  if (status === "purchased") return "border-l-saved";
  if (status === "in_cart") return "border-l-cart";
  return "border-l-list";
}

function statusBadge(status: ShoppingStatus) {
  if (status === "in_cart") {
    return {
      label: "Carrito",
      className: "text-cart bg-amber-50 border border-amber-200",
    };
  }
  if (status === "purchased") {
    return {
      label: "Comprado",
      className: "text-saved bg-saved-bg border border-sky-200",
    };
  }
  return {
    label: "Pendiente",
    className: "text-list bg-slate-100 border border-slate-200",
  };
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
}: {
  item: ShoppingItem;
  onCycleState: () => void;
  onSelectState: (target: ShoppingStatus | ProductStage) => void;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onUpdateUnit: (unit: string) => void;
  onRemove: () => void;
  actionsSide?: ActionsSide;
}) {
  const p = item.product;
  const lineTotal = item.qty * item.price;
  const unitLabel = p?.unit ?? "pz";
  const status = itemStatus(item);
  const badge = statusBadge(status);

  return (
    <SwipeableRow onDelete={onRemove} onCycleState={onCycleState}>
      <article
        className={`surface rounded-lg border-l-[3px] ${accentClass(status)} px-3 py-2.5`}
        aria-label={`${p?.name ?? "Producto"}, ${status}`}
      >
        <div className="flex items-center gap-2">
          {actionsSide === "left" && (
            <StateCycleButton
              stage={status}
              context="lista"
              onCycle={onCycleState}
              onSelectState={onSelectState}
            />
          )}
          <h3
            className={`flex-1 min-w-0 text-base font-semibold text-ink truncate
              ${status === "purchased" ? "line-through text-ink-faint" : ""}`}
          >
            {p?.name ?? "—"}
          </h3>
          <span
            className={`px-2 py-0.5 rounded-full text-[11px] leading-none font-semibold ${badge.className}`}
            aria-label={`Estado: ${badge.label}`}
          >
            {badge.label}
          </span>
          {actionsSide === "right" && (
            <StateCycleButton
              stage={status}
              context="lista"
              onCycle={onCycleState}
              onSelectState={onSelectState}
            />
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-2 mt-2.5 text-sm text-ink-muted font-medium"
          data-no-swipe
        >
          <QtyStepper
            compact
            value={item.qty}
            onChange={onUpdateQty}
            label={`Cantidad de ${p?.name}`}
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
            displayClassName="min-w-[4rem] justify-center tabular-nums text-cart"
            inputClassName="w-20 text-center"
          />

          <span className="text-ink-faint hidden sm:inline">·</span>

          <select
            value={unitLabel}
            onChange={(e) => onUpdateUnit(e.target.value)}
            className="edit-select min-w-[3rem] text-center"
            aria-label="Unidad"
          >
            <option value="pz">pz</option>
            <option value="kg">kg</option>
            <option value="L">L</option>
            <option value="g">g</option>
            <option value="ml">ml</option>
          </select>

          <span className="ml-auto text-sm font-bold text-ink tabular-nums">
            {money(lineTotal)}
          </span>
        </div>
      </article>
    </SwipeableRow>
  );
}
