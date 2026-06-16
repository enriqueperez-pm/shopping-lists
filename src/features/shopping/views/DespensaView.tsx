"use client";

import { Plus, ChevronDown } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import ProductCard from "@/components/ProductCard";
import EmptyState from "@/components/EmptyState";
import AddProductModal from "@/components/AddProductModal";
import { resolveProductStage } from "@/lib/productStage";
import { useShoppingContext } from "../ShoppingProvider";

export default function DespensaView() {
  const {
    categories,
    grouped,
    pLoading,
    search,
    setSearch,
    filter,
    setFilter,
    collapsed,
    toggleCollapse,
    showAdd,
    setShowAdd,
    actionsSide,
    toggleActionsSide,
    density,
    toggleDensity,
    isCompact,
    pantryCount,
    neededCount,
    cartCount,
    purchasedCount,
    statusByProduct,
    handleAddProduct,
    handleCycleDespensa,
    handleSelectDespensaStage,
    handleDeleteProduct,
    updateProduct,
  } = useShoppingContext();

  return (
    <>
      <AppHeader
        title="Despensa"
        subtitle={`${pantryCount} despensa · ${neededCount} pendiente · ${cartCount} carrito · ${purchasedCount} comprado`}
        actionsSide={actionsSide}
        onToggleActionsSide={toggleActionsSide}
        density={density}
        onToggleDensity={toggleDensity}
      />

      <div
        className="flex-1 min-h-0 overflow-y-auto compras-scroll-pad view-fade px-[var(--pad,1rem)] pt-3 space-y-3"
        style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
      >
        <SearchBar value={search} onChange={setSearch} />
        <FilterChips active={filter} onChange={setFilter} />

        {pLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon="📦"
            title={search ? "Sin resultados" : "Despensa vacia"}
            description={search ? "Intenta con otro termino" : "Agrega productos con el boton +"}
          />
        ) : (
          grouped.map(([cat, prods]) => (
            <section key={cat} className="mb-1">
              <button
                onClick={() => toggleCollapse(`despensa:${cat}`)}
                className="flex items-center justify-between w-full py-1.5 px-0.5 mb-1"
                aria-expanded={!collapsed[`despensa:${cat}`]}
                aria-label={`Categoria ${cat}, ${prods.length} productos`}
              >
                <span className="category-label uppercase">{cat}</span>
                <span className="flex items-center gap-1 text-xs text-ink-faint font-medium">
                  {prods.length}
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${collapsed[`despensa:${cat}`] ? "-rotate-90" : ""}`}
                  />
                </span>
              </button>

              {!collapsed[`despensa:${cat}`] && (
                <div className={isCompact ? "space-y-1" : "space-y-1.5"}>
                  {prods.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      stage={resolveProductStage(p, statusByProduct)}
                      onCycleState={() => handleCycleDespensa(p.id)}
                      onSelectState={(target) => handleSelectDespensaStage(p.id, target)}
                      onUpdate={(updates) => updateProduct(p.id, updates)}
                      onDelete={() => handleDeleteProduct(p)}
                      actionsSide={actionsSide}
                      density={density}
                    />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed right-4 z-30 w-11 h-11 rounded-full bg-brand-500 text-white shadow-float flex items-center justify-center transition-all duration-fast active:scale-[0.98] hover:bg-brand-600"
        style={{ bottom: "calc(3.75rem + env(safe-area-inset-bottom, 0px) + .65rem)" }}
        aria-label="Agregar producto"
      >
        <Plus size={20} strokeWidth={2.5} />
      </button>

      {showAdd && (
        <AddProductModal
          categories={categories}
          onAdd={handleAddProduct}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
}
