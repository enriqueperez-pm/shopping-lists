"use client";

import { Plus, Share2, CheckCircle2, ReceiptText, Archive, ShoppingCart, ChevronDown } from "lucide-react";
import AppHeader from "@/components/AppHeader";
import SearchBar from "@/components/SearchBar";
import ShopItem from "@/components/ShopItem";
import EmptyState from "@/components/EmptyState";
import AddProductModal from "@/components/AddProductModal";
import TripTotalBar from "@/components/TripTotalBar";
import AppFab from "@/components/ui/AppFab";
import { useShoppingContext } from "../ShoppingProvider";

export default function ListaView() {
  const {
    categories,
    shopping,
    sLoading,
    listaSearch,
    setListaSearch,
    collapsed,
    toggleCollapse,
    showAdd,
    setShowAdd,
    actionsSide,
    toggleActionsSide,
    density,
    toggleDensity,
    isCompact,
    listNeededCount,
    listCartCount,
    listPurchasedCount,
    groupedShopping,
    totalNeeded,
    totalInCart,
    totalPurchased,
    tripTotal,
    budget,
    setBudget,
    handleShareList,
    handleShareReceipt,
    handleMoveAllToCart,
    handleConfirmCartPurchase,
    handleArchiveTrip,
    handleMovePurchasedToPantry,
    handleAddProduct,
    handleCycleLista,
    handleSelectListaStage,
    handleRemoveFromList,
    updateQty,
    updatePrice,
    updateUnit,
    refetchProducts,
  } = useShoppingContext();

  return (
    <>
      <AppHeader
        title="Lista"
        subtitle={`${listNeededCount} pendiente${listNeededCount !== 1 ? "s" : ""} · ${listCartCount} carrito · ${listPurchasedCount} comprado`}
        actionsSide={actionsSide}
        onToggleActionsSide={toggleActionsSide}
        density={density}
        onToggleDensity={toggleDensity}
      />

      <div
        className="shrink-0 px-[var(--pad,1rem)] pt-2 pb-1"
        style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
      >
        <SearchBar value={listaSearch} onChange={setListaSearch} placeholder="Buscar en la lista..." />
      </div>

      <div
        className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar px-[var(--pad,1rem)] py-2.5 border-b border-[var(--border-hairline)]"
        style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
      >
        <button type="button" onClick={handleShareList} className="btn-primary shrink-0">
          <Share2 size={13} />
          Compartir
        </button>
        <button type="button" onClick={handleShareReceipt} className="btn-soft shrink-0">
          <ReceiptText size={13} />
          Ticket
        </button>
        <button
          type="button"
          onClick={handleMoveAllToCart}
          disabled={listNeededCount === 0}
          className="btn-soft shrink-0 text-list"
        >
          <ShoppingCart size={13} />
          Todo al carrito
        </button>
        <button
          type="button"
          onClick={handleConfirmCartPurchase}
          disabled={listCartCount === 0}
          className="btn-soft shrink-0 !bg-cart !text-white !border-transparent hover:!bg-cart/90"
        >
          <CheckCircle2 size={13} />
          Comprar
        </button>
        <button
          type="button"
          onClick={handleArchiveTrip}
          disabled={listPurchasedCount === 0}
          className="btn-soft shrink-0"
        >
          <Archive size={13} />
          Guardar
        </button>
        <button
          type="button"
          onClick={handleMovePurchasedToPantry}
          disabled={listPurchasedCount === 0}
          className="btn-soft shrink-0"
        >
          <CheckCircle2 size={13} />
          A despensa
        </button>
      </div>

      <div
        className="app-scroll-y view-fade px-[var(--pad,1rem)] pt-3 space-y-2 compras-scroll-pad-lista"
        style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
      >
        {sLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="app-spinner" />
          </div>
        ) : shopping.length === 0 ? (
          <EmptyState
            icon="🛒"
            title="Lista vacia"
            description="Ve a Despensa y marca los productos que faltan para agregarlos aqui."
          />
        ) : groupedShopping.length === 0 ? (
          <EmptyState icon="🔍" title="Sin resultados" description="Intenta con otro termino" />
        ) : (
          groupedShopping.map(([cat, items]) => (
            <section key={cat} className="mb-1">
              <button
                onClick={() => toggleCollapse(`lista:${cat}`)}
                className="flex items-center justify-between w-full py-1.5 px-0.5 mb-1"
                aria-expanded={!collapsed[`lista:${cat}`]}
                aria-label={`Categoria ${cat}, ${items.length} productos`}
              >
                <span className="category-label uppercase">{cat}</span>
                <span className="flex items-center gap-1 text-xs text-ink-faint font-medium">
                  {items.length}
                  <ChevronDown
                    size={12}
                    className={`transition-transform ${collapsed[`lista:${cat}`] ? "-rotate-90" : ""}`}
                  />
                </span>
              </button>

              {!collapsed[`lista:${cat}`] && (
                <div className={isCompact ? "space-y-1" : "space-y-1.5"}>
                  {items.map((s) => (
                    <ShopItem
                      key={s.id}
                      item={s}
                      onCycleState={() => handleCycleLista(s)}
                      onSelectState={(target) => handleSelectListaStage(s, target)}
                      onUpdateQty={(qty) => updateQty(s.id, qty)}
                      onUpdatePrice={(price) => updatePrice(s.id, price)}
                      onUpdateUnit={async (unit) => {
                        await updateUnit(s.id, s.product_id, unit);
                        refetchProducts();
                      }}
                      onRemove={() => handleRemoveFromList(s)}
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

      <TripTotalBar
        tripTotal={tripTotal}
        totalNeeded={totalNeeded}
        totalInCart={totalInCart}
        totalPurchased={totalPurchased}
        budget={budget}
        onBudgetChange={setBudget}
      />

      <AppFab
        variant="lista"
        onClick={() => setShowAdd(true)}
        ariaLabel="Agregar producto"
      >
        <Plus size={20} strokeWidth={2.5} />
      </AppFab>

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
