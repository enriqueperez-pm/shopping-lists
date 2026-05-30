"use client";

import { useState } from "react";
import { ChevronDown, Share2, Trash2 } from "lucide-react";
import type { PurchaseTrip } from "@/lib/types";
import EmptyState from "./EmptyState";

function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TripCard({
  trip,
  onDelete,
}: {
  trip: PurchaseTrip;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const items = trip.items ?? [];

  const handleShare = async () => {
    const lines = items.map(
      (i) => `- ${i.product_name} x${i.qty} ${i.unit} · ${money(i.price)} = ${money(i.line_total)}`,
    );
    const text = `Compra ${formatDate(trip.purchased_at)}\n${lines.join("\n")}\n\nTotal: ${money(trip.total)}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  return (
    <article className="surface-soft overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors duration-fast hover:bg-[rgba(21,49,49,0.02)]"
        aria-expanded={open}
      >
        <div className="flex-1 min-w-0">
          <p className="text-body font-semibold text-ink truncate">{formatDate(trip.purchased_at)}</p>
          <p className="text-caption mt-0.5">
            {formatTime(trip.purchased_at)} · {trip.item_count} producto{trip.item_count !== 1 ? "s" : ""}
          </p>
        </div>
        <p className="text-body font-bold text-brand-600 tabular-nums shrink-0 tracking-tight">
          {money(trip.total)}
        </p>
        <ChevronDown
          size={15}
          className={`text-ink-faint shrink-0 transition-transform duration-normal ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div className="details-panel" data-open={open ? "true" : "false"}>
        {open && (
          <div className="border-t border-[var(--border-hairline)] px-3.5 py-2.5 space-y-1.5">
            {items.map((i) => (
              <div key={i.id} className="flex items-baseline gap-2 text-caption">
                <span className="flex-1 min-w-0 text-ink truncate">{i.product_name}</span>
                <span className="text-ink-faint tabular-nums shrink-0">
                  {i.qty} {i.unit}
                </span>
                <span className="font-semibold text-ink tabular-nums shrink-0 w-16 text-right">
                  {money(i.line_total)}
                </span>
              </div>
            ))}

            <div className="flex gap-1.5 pt-2 border-t border-[var(--border-hairline)]">
              <button type="button" onClick={handleShare} className="btn-soft text-brand-600">
                <Share2 size={12} />
                Compartir
              </button>
              <button
                type="button"
                onClick={() => onDelete(trip.id)}
                className="btn-soft text-danger ml-auto"
              >
                <Trash2 size={12} />
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export default function PurchaseHistory({
  trips,
  loading,
  onDelete,
}: {
  trips: PurchaseTrip[];
  loading: boolean;
  onDelete: (id: string) => void;
}) {
  const totalAll = trips.reduce((sum, t) => sum + t.total, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-7 h-7 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <EmptyState
        icon="🧾"
        title="Sin compras archivadas"
        description="Guarda una visita desde Lista cuando marques productos como comprados."
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-caption px-0.5 tabular-nums">
        {trips.length} visita{trips.length !== 1 ? "s" : ""} · {money(totalAll)} total
      </p>
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} onDelete={onDelete} />
      ))}
    </div>
  );
}
