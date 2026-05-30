"use client";

import { X, Plus } from "lucide-react";
import { useState } from "react";
import type { Category } from "@/lib/types";
import { clampQty, clampQtyInt, QTY_MIN } from "@/lib/qty";

export default function AddProductModal({
  categories,
  onAdd,
  onClose,
}: {
  categories: Category[];
  onAdd: (p: { name: string; category_id: number; ref_price: number; unit: string; ref_qty: number }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? 1);
  const [price, setPrice] = useState(0);
  const [unit, setUnit] = useState("pz");
  const [qtyInput, setQtyInput] = useState("1");

  const valid = name.trim().length > 0;
  const normalizeQty = (raw: string, unitValue: string) => {
    const parsed = Number(raw.replace(",", "."));
    if (unitValue === "pz") return clampQtyInt(Number.isFinite(parsed) ? parsed : 1);
    return clampQty(Number.isFinite(parsed) ? parsed : QTY_MIN);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog" aria-modal aria-label="Agregar producto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl
        shadow-2xl p-6 pb-8 z-10 max-h-[85vh] overflow-y-auto">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center
            justify-center bg-slate-100 text-slate-500 hover:bg-slate-200 transition touch-target"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <h2 className="text-lg font-extrabold text-slate-900 mb-5 tracking-tight">
          Agregar producto
        </h2>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Nombre
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Leche entera 1L"
              className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-3
                text-sm font-medium text-slate-800 outline-none
                focus:border-brand-400 focus:ring-2 focus:ring-brand-100
                placeholder:text-slate-400 touch-target"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full border-[1.5px] border-slate-200 rounded-xl px-4 py-3
                text-sm font-medium text-slate-800 outline-none
                focus:border-brand-400 touch-target appearance-none bg-white"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Price + Unit + Qty row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Precio
              </label>
              <div className="flex items-center border-[1.5px] border-slate-200 rounded-xl px-3 py-3
                focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
                <span className="text-xs font-bold text-slate-400 mr-1">$</span>
                <input
                  type="number"
                  value={price || ""}
                  step="0.01"
                  min={0}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-800
                    outline-none tabular-nums"
                  aria-label="Precio"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Unidad
              </label>
              <select
                value={unit}
                onChange={(e) => {
                  const nextUnit = e.target.value;
                  setUnit(nextUnit);
                  setQtyInput((prev) => String(normalizeQty(prev, nextUnit)));
                }}
                className="w-full border-[1.5px] border-slate-200 rounded-xl px-3 py-3
                  text-sm font-semibold text-center text-slate-800 outline-none
                  focus:border-brand-400 touch-target appearance-none bg-white"
              >
                <option value="pz">pz</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Cant.
              </label>
              <input
                type="text"
                inputMode={unit === "pz" ? "numeric" : "decimal"}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onBlur={() => setQtyInput(String(normalizeQty(qtyInput, unit)))}
                className="w-full border-[1.5px] border-slate-200 rounded-xl px-3 py-3
                  text-sm font-semibold text-center text-slate-800 outline-none
                  focus:border-brand-400 tabular-nums touch-target"
                aria-label="Cantidad de referencia"
              />
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (!valid) return;
            const normalizedQty = normalizeQty(qtyInput, unit);
            onAdd({ name: name.trim(), category_id: categoryId, ref_price: price, unit, ref_qty: normalizedQty });
          }}
          disabled={!valid}
          className="mt-6 w-full flex items-center justify-center gap-2
            bg-gradient-to-r from-brand-500 to-brand-600 text-white
            font-bold text-sm rounded-xl py-3.5 touch-target
            shadow-float transition-all active:scale-[.98]
            disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={18} />
          Agregar a la despensa
        </button>
      </div>
    </div>
  );
}
