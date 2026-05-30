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
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal
      aria-label="Agregar producto"
    >
      <div className="absolute inset-0 bg-ink/20 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative w-full max-w-md bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-2xl
          shadow-float p-6 pb-8 z-10 max-h-[85vh] overflow-y-auto border border-[var(--border-hairline)]"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border-soft)] sm:hidden" aria-hidden />

        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 btn-ghost"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <h2 className="text-title text-lg font-bold mb-5 pr-10">Agregar producto</h2>

        <div className="space-y-4">
          <div>
            <label className="modal-label">Nombre</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Leche entera 1L"
              className="modal-input touch-target"
            />
          </div>

          <div>
            <label className="modal-label">Categoria</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="modal-input touch-target appearance-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="modal-label">Precio</label>
              <div className="modal-input flex items-center gap-1 !py-2">
                <span className="text-caption text-ink-faint">$</span>
                <input
                  type="number"
                  value={price || ""}
                  step="0.01"
                  min={0}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="w-full bg-transparent outline-none tabular-nums text-body"
                  aria-label="Precio"
                />
              </div>
            </div>

            <div>
              <label className="modal-label">Unidad</label>
              <select
                value={unit}
                onChange={(e) => {
                  const nextUnit = e.target.value;
                  setUnit(nextUnit);
                  setQtyInput((prev) => String(normalizeQty(prev, nextUnit)));
                }}
                className="modal-input text-center appearance-none"
              >
                <option value="pz">pz</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
              </select>
            </div>

            <div>
              <label className="modal-label">Cant.</label>
              <input
                type="text"
                inputMode={unit === "pz" ? "numeric" : "decimal"}
                value={qtyInput}
                onChange={(e) => setQtyInput(e.target.value)}
                onBlur={() => setQtyInput(String(normalizeQty(qtyInput, unit)))}
                className="modal-input text-center tabular-nums"
                aria-label="Cantidad de referencia"
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!valid) return;
            const normalizedQty = normalizeQty(qtyInput, unit);
            onAdd({ name: name.trim(), category_id: categoryId, ref_price: price, unit, ref_qty: normalizedQty });
          }}
          disabled={!valid}
          className="btn-primary mt-6 w-full !py-3 touch-target disabled:opacity-40"
        >
          <Plus size={18} />
          Agregar a la despensa
        </button>
      </div>
    </div>
  );
}
