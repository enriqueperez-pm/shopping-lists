"use client";

import { Package, ShoppingCart, Trash2 } from "lucide-react";
import type { Category, Product } from "@/lib/types";

export default function ProductCard({
  product,
  categories,
  onToggleStock,
  onUpdate,
  onDelete,
}: {
  product: Product;
  categories: Category[];
  onToggleStock: (inStock: boolean) => void;
  onUpdate: (updates: Partial<Product>) => void;
  onDelete: () => void;
}) {
  const p = product;
  const isStock = p.in_stock;

  return (
    <article
      className={`bg-white rounded-xl border-[1.5px] shadow-card p-4 flex gap-3
        transition-colors ${
          isStock
            ? "border-emerald-200 bg-gradient-to-r from-white to-emerald-50/60"
            : "border-slate-200"
        }`}
      aria-label={`${p.name}${isStock ? ", en casa" : ", falta comprar"}`}
    >
      {/* Info column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Product name — hero element */}
        <input
          type="text"
          value={p.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full text-[1.02rem] font-bold text-slate-900 tracking-tight
            bg-transparent border-0 p-0 outline-none focus:ring-0
            placeholder:text-slate-400 leading-snug"
          placeholder="Nombre del producto"
          aria-label="Nombre"
        />

        {/* Category — secondary */}
        <select
          value={p.category_id ?? ""}
          onChange={(e) => onUpdate({ category_id: Number(e.target.value) || null })}
          className="mt-2 w-full text-[.78rem] font-medium text-slate-500
            bg-white border border-slate-200 rounded-lg px-2.5 py-2
            outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100
            touch-target appearance-none"
          aria-label="Categoria"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Metrics panel */}
        <div className="mt-3 grid grid-cols-3 gap-2 bg-slate-50 border border-slate-200
          rounded-lg p-2.5">
          {/* Ref qty */}
          <div className="flex flex-col">
            <label className="text-[.58rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Cant. ref
            </label>
            <input
              type="number"
              value={p.ref_qty}
              min={1}
              max={99}
              onChange={(e) => onUpdate({ ref_qty: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })}
              className="w-full bg-white border border-slate-200 rounded-md text-center
                text-sm font-semibold text-slate-800 py-2 outline-none
                focus:border-brand-400 tabular-nums touch-target"
              aria-label="Cantidad de referencia"
            />
          </div>

          {/* Price */}
          <div className="flex flex-col">
            <label className="text-[.58rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Precio
            </label>
            <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md px-2 py-2">
              <span className="text-xs font-bold text-slate-400">$</span>
              <input
                type="number"
                value={p.ref_price}
                step="0.50"
                min={0}
                onChange={(e) => onUpdate({ ref_price: Math.max(0, Number(e.target.value) || 0) })}
                className="w-full bg-transparent text-sm font-semibold text-slate-800
                  outline-none tabular-nums min-w-0"
                aria-label="Precio de referencia"
              />
            </div>
          </div>

          {/* Unit */}
          <div className="flex flex-col">
            <label className="text-[.58rem] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Unidad
            </label>
            <select
              value={p.unit}
              onChange={(e) => onUpdate({ unit: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-md text-center
                text-sm font-semibold text-slate-800 py-2 outline-none
                focus:border-brand-400 touch-target appearance-none"
              aria-label="Unidad"
            >
              <option value="pz">pz</option>
              <option value="kg">kg</option>
              <option value="L">L</option>
              <option value="g">g</option>
              <option value="ml">ml</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions column */}
      <div className="flex flex-col items-center gap-2 pl-3 border-l border-slate-200 shrink-0">
        <button
          onClick={() => onToggleStock(!isStock)}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-[.74rem] font-bold
            border-[1.5px] whitespace-nowrap touch-target transition-all active:scale-95
            ${isStock
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-brand-300 bg-brand-50 text-brand-700"
            }`}
          aria-label={isStock ? "Marcar como faltante" : "Marcar como en casa"}
        >
          {isStock ? <Package size={15} /> : <ShoppingCart size={15} />}
          {isStock ? "En casa" : "Falta"}
        </button>

        <button
          onClick={onDelete}
          className="w-10 h-10 rounded-lg flex items-center justify-center
            border-[1.5px] border-slate-200 bg-white text-rose-500
            transition hover:bg-rose-50 hover:border-rose-300 active:scale-95 touch-target"
          aria-label={`Eliminar ${p.name}`}
        >
          <Trash2 size={16} />
        </button>
      </div>
    </article>
  );
}
