"use client";

import { Check, X } from "lucide-react";
import QtyStepper from "./QtyStepper";
import type { ShoppingItem } from "@/lib/types";
import { useState } from "react";

function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function ShopItem({
  item,
  onToggleCheck,
  onUpdateQty,
  onUpdatePrice,
  onRemove,
}: {
  item: ShoppingItem;
  onToggleCheck: (checked: boolean) => void;
  onUpdateQty: (qty: number) => void;
  onUpdatePrice: (price: number) => void;
  onRemove: () => void;
}) {
  const p = item.product;
  const [editingPrice, setEditingPrice] = useState(false);
  const lineTotal = item.qty * item.price;
  const unitLabel = p?.unit ?? "pz";
  const isKg = unitLabel === "kg" || unitLabel === "g";

  return (
    <article
      className={`bg-white rounded-xl border-[1.5px] shadow-card transition-all
        ${item.checked
          ? "opacity-60 border-emerald-200 bg-gradient-to-r from-white to-emerald-50/50"
          : "border-slate-200"
        }`}
      aria-label={`${p?.name ?? "Producto"}, ${item.checked ? "comprado" : "pendiente"}`}
    >
      {/* Header: checkbox + name + category chip */}
      <div className="flex items-start gap-3 p-4 pb-0">
        <label className="flex items-center mt-0.5 cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={item.checked}
            onChange={(e) => onToggleCheck(e.target.checked)}
            className="sr-only peer"
            aria-label={`Marcar ${p?.name} como comprado`}
          />
          <span className={`w-[22px] h-[22px] rounded-md border-2 flex items-center
            justify-center transition-all
            ${item.checked
              ? "bg-emerald-500 border-emerald-500"
              : "bg-white border-slate-300 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400"
            }`}>
            {item.checked && <Check size={14} className="text-white" strokeWidth={3} />}
          </span>
        </label>

        <h3 className={`flex-1 min-w-0 text-[1.02rem] font-bold text-slate-900
          tracking-tight leading-snug ${item.checked ? "line-through" : ""}`}>
          {p?.name ?? "—"}
        </h3>

        {p?.category && (
          <span className="shrink-0 text-[.62rem] font-bold px-2 py-0.5 rounded-full
            bg-brand-50 text-brand-600 whitespace-nowrap mt-0.5">
            {p.category.name}
          </span>
        )}
      </div>

      {/* Metrics panel */}
      <div className="mx-4 mt-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3
        flex flex-wrap items-end gap-x-4 gap-y-3">
        {/* Qty */}
        <div className="flex flex-col gap-1">
          <span className="text-[.58rem] font-semibold uppercase tracking-wider text-slate-500">
            Cantidad
          </span>
          <div className="flex items-center gap-2">
            <QtyStepper
              value={item.qty}
              onChange={onUpdateQty}
              min={isKg ? 0.25 : 1}
              step={isKg ? 0.25 : 1}
              label={`Cantidad de ${p?.name}`}
            />
            <span className="text-[.78rem] font-bold text-cyan-600">{unitLabel}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1 flex-1 min-w-[7rem]">
          <span className="text-[.58rem] font-semibold uppercase tracking-wider text-slate-500">
            P.U.
            {isKg && <span className="normal-case text-slate-400"> /{unitLabel}</span>}
          </span>
          {editingPrice ? (
            <input
              type="number"
              autoFocus
              value={item.price}
              step="0.50"
              min={0}
              onChange={(e) => onUpdatePrice(Math.max(0, Number(e.target.value) || 0))}
              onBlur={() => setEditingPrice(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingPrice(false)}
              className="w-full border-[1.5px] border-brand-400 bg-brand-50 rounded-lg
                px-3 py-2.5 text-sm font-bold text-slate-800 outline-none
                tabular-nums touch-target"
              aria-label="Editar precio"
            />
          ) : (
            <button
              onClick={() => setEditingPrice(true)}
              className="w-full text-left border-[1.5px] border-slate-200 bg-white
                rounded-lg px-3 py-2.5 text-sm font-bold text-brand-600
                tabular-nums touch-target transition hover:border-brand-300
                active:border-brand-400"
              aria-label={`Precio: ${money(item.price)}, toca para editar`}
            >
              {money(item.price)}
            </button>
          )}
        </div>

        {/* Line total */}
        <div className="flex flex-col items-end gap-1 ml-auto">
          <span className="text-[.54rem] font-semibold text-slate-400 tabular-nums">
            {item.qty} x {money(item.price)}
          </span>
          <span className="text-base font-extrabold text-brand-600 tabular-nums
            bg-brand-50 border border-brand-200 rounded-lg px-3 py-1.5">
            {money(lineTotal)}
          </span>
        </div>
      </div>

      {/* Remove button — bottom right */}
      <div className="flex justify-end px-4 pb-3">
        <button
          onClick={onRemove}
          className="flex items-center gap-1 text-[.72rem] font-semibold text-rose-500
            hover:text-rose-600 transition touch-target px-2 py-1.5 rounded-md
            hover:bg-rose-50"
          aria-label={`Quitar ${p?.name} de la lista`}
        >
          <X size={14} />
          Quitar
        </button>
      </div>
    </article>
  );
}
