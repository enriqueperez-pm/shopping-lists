"use client";

import AppHeader from "@/components/AppHeader";
import PurchaseHistory from "@/components/PurchaseHistory";
import { showToast } from "@/components/Toast";
import { useShoppingContext } from "../ShoppingProvider";

export default function HistorialView() {
  const { trips, hLoading, deleteTrip } = useShoppingContext();

  return (
    <>
      <AppHeader title="Historial" subtitle="Compras archivadas" showControls={false} />

      <div
        className="flex-1 min-h-0 overflow-y-auto compras-scroll-pad view-fade px-[var(--pad,1rem)] pt-3"
        style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
      >
        <PurchaseHistory
          trips={trips}
          loading={hLoading}
          onDelete={async (id) => {
            await deleteTrip(id);
            showToast("Visita eliminada");
          }}
        />
      </div>
    </>
  );
}
