"use client";

import { useState } from "react";
import { useFinance } from "./FinancialDbProvider";
import { money } from "@/lib/money";

type Props = {
  calculated: number;
  manualOverride: number | null;
  onClose: () => void;
};

export default function AdjustBalanceModal({ calculated, manualOverride, onClose }: Props) {
  const { db, selectedPeriod, refresh } = useFinance();
  const [value, setValue] = useState(String(manualOverride ?? calculated));

  const save = () => {
    const n = Number(value);
    if (!Number.isNaN(n)) {
      db.setManualAvailable(selectedPeriod, n);
      refresh();
    }
    onClose();
  };

  const clear = () => {
    db.setManualAvailable(selectedPeriod, null);
    refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-md surface-soft p-4 space-y-4">
        <h2 className="text-title">Ajustar disponible</h2>
        <p className="text-caption">
          Calculado automáticamente: <strong className="text-ink">{money(calculated)}</strong>
        </p>
        <label className="block space-y-1">
          <span className="modal-label">Monto manual</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="modal-input tabular-nums"
          />
        </label>
        <div className="flex gap-2 justify-end pt-1">
          {manualOverride != null ? (
            <button type="button" className="btn-soft mr-auto" onClick={clear}>
              Usar calculado
            </button>
          ) : null}
          <button type="button" className="btn-soft" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-primary" onClick={save}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
