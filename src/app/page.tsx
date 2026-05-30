"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { Plus, Share2, CheckCircle2, ChevronDown, ReceiptText, Archive, ShoppingCart } from "lucide-react";
import { useCategories, useProducts, useShopping, usePurchaseHistory } from "@/lib/hooks";
import type { ShoppingStatus } from "@/lib/types";
import { itemStatus } from "@/lib/purchase";
import BottomNav, { type Tab } from "@/components/BottomNav";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import ProductCard from "@/components/ProductCard";
import ShopItem from "@/components/ShopItem";
import PurchaseHistory from "@/components/PurchaseHistory";
import AddProductModal from "@/components/AddProductModal";
import EmptyState from "@/components/EmptyState";
import Toast, { showToast, showUndoToast } from "@/components/Toast";
import type { Product, ShoppingItem } from "@/lib/types";
import ActionsSideToggle from "@/components/ActionsSideToggle";
import {
  groupProductsByCategory,
  groupShoppingByCategory,
  flattenGrouped,
} from "@/lib/grouping";
import { resolveProductStage, buildStatusMap, nextStage, type ProductStage } from "@/lib/productStage";
import { useCardLayout } from "@/lib/useCardLayout";

type Filter = "all" | "pantry" | "needed" | "in_cart" | "purchased";
const STORAGE_KEY = "shopping-ui-state-v1";

type UiState = {
  tab: Tab;
  search: string;
  listaSearch: string;
  filter: Filter;
  collapsed: Record<string, boolean>;
};

function readUiState(): UiState | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<UiState>;
    const tab: Tab = parsed.tab === "lista" || parsed.tab === "historial" ? parsed.tab : "despensa";
    const filter: Filter = parsed.filter === "pantry" || parsed.filter === "needed" || parsed.filter === "in_cart" || parsed.filter === "purchased"
      ? parsed.filter
      : "all";
    return {
      tab,
      search: typeof parsed.search === "string" ? parsed.search : "",
      listaSearch: typeof parsed.listaSearch === "string" ? parsed.listaSearch : "",
      filter,
      collapsed: parsed.collapsed && typeof parsed.collapsed === "object" ? parsed.collapsed : {},
    };
  } catch {
    return null;
  }
}

function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function Home() {
  const initialUi = useMemo(() => readUiState(), []);
  const [tab, setTab] = useState<Tab>(initialUi?.tab ?? "despensa");
  const [search, setSearch] = useState(initialUi?.search ?? "");
  const [listaSearch, setListaSearch] = useState(initialUi?.listaSearch ?? "");
  const [filter, setFilter] = useState<Filter>(initialUi?.filter ?? "all");
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialUi?.collapsed ?? {});
  const { actionsSide, toggleActionsSide } = useCardLayout();

  const categories = useCategories();
  const {
    products,
    loading: pLoading,
    addProduct,
    updateProduct,
    patchProduct,
    setPantry,
    setShoppingStatusForProduct,
    deleteProduct,
    restoreProduct,
    refetch: refetchProducts,
  } = useProducts();
  const {
    items: shopping,
    loading: sLoading,
    setStatus,
    updateQty,
    updatePrice,
    updateUnit,
    removeFromList,
    patchItemForProduct,
    removeItemOptimistic,
    restoreShoppingItem,
    moveAllToCart,
    confirmCartPurchase,
    movePurchasedToPantry,
    archivePurchasedTrip,
    refetch: refetchShopping,
  } = useShopping();
  const {
    trips,
    loading: hLoading,
    refetch: refetchHistory,
    deleteTrip,
  } = usePurchaseHistory();

  const handleTabChange = useCallback((t: Tab) => {
    setTab(t);
  }, []);

  useEffect(() => {
    const next: UiState = { tab, search, listaSearch, filter, collapsed };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, [tab, search, listaSearch, filter, collapsed]);

  // ── Despensa logic ──
  const statusByProduct = useMemo(() => buildStatusMap(shopping), [shopping]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const stage = resolveProductStage(p, statusByProduct);
      if (filter === "pantry" && stage !== "pantry") return false;
      if (filter === "needed" && stage !== "needed") return false;
      if (filter === "in_cart" && stage !== "in_cart") return false;
      if (filter === "purchased" && stage !== "purchased") return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.category?.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, statusByProduct, search, filter]);

  const grouped = useMemo(
    () => groupProductsByCategory(filteredProducts),
    [filteredProducts],
  );

  const pantryCount = products.filter((p) => p.in_stock).length;
  const neededCount = products.filter((p) => resolveProductStage(p, statusByProduct) === "needed").length;
  const cartCount = products.filter((p) => resolveProductStage(p, statusByProduct) === "in_cart").length;
  const purchasedCount = products.filter((p) => resolveProductStage(p, statusByProduct) === "purchased").length;

  const listNeededCount = shopping.filter((s) => itemStatus(s) === "needed").length;
  const listCartCount = shopping.filter((s) => itemStatus(s) === "in_cart").length;
  const listPurchasedCount = shopping.filter((s) => itemStatus(s) === "purchased").length;

  // Lista: agrupada por categoría, orden estable (sin saltar al cambiar status)
  const filteredShopping = useMemo(() => {
    const q = listaSearch.toLowerCase();
    if (!q) return shopping;
    return shopping.filter((s) => {
      const name = s.product?.name ?? "";
      const cat = s.product?.category?.name ?? "";
      return name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [shopping, listaSearch]);

  const groupedShopping = useMemo(
    () => groupShoppingByCategory(filteredShopping),
    [filteredShopping],
  );
  const naturalShopping = useMemo(
    () => flattenGrouped(groupedShopping),
    [groupedShopping],
  );

  const totalNeeded = shopping
    .filter((s) => itemStatus(s) === "needed")
    .reduce((sum, s) => sum + s.qty * s.price, 0);
  const totalInCart = shopping
    .filter((s) => itemStatus(s) === "in_cart")
    .reduce((sum, s) => sum + s.qty * s.price, 0);
  const totalPurchased = shopping
    .filter((s) => itemStatus(s) === "purchased")
    .reduce((sum, s) => sum + s.qty * s.price, 0);
  const tripTotal = totalInCart + totalPurchased;

  const cyclingRef = useRef(new Set<string>());

  // ── Handlers ──
  const handleAddProduct = async (p: { name: string; category_id: number; ref_price: number; unit: string; ref_qty: number }) => {
    const { error } = await addProduct(p);
    if (!error) {
      setShowAdd(false);
      showToast(`${p.name} agregado`);
      refetchShopping();
    } else {
      showToast("No se pudo agregar el producto");
    }
  };

  const handleSetPantry = async (id: string) => {
    patchProduct(id, { in_stock: true });
    removeItemOptimistic(id);
    const res = await setPantry(id, true);
    await refetchProducts();
    await refetchShopping();
    if (res?.error) {
      showToast("No se pudo guardar en despensa");
      return;
    }
    showToast("Marcado en despensa");
    refetchHistory();
  };

  const handleSetShoppingStatus = async (id: string, status: ShoppingStatus) => {
    const product = products.find((p) => p.id === id);
    const wasOffList = product
      ? resolveProductStage(product, statusByProduct) === "off_list"
      : false;
    if (product) {
      patchProduct(id, { in_stock: false });
      patchItemForProduct(id, status, { ...product, in_stock: false });
    }
    const res = await setShoppingStatusForProduct(id, status);
    await refetchProducts();
    await refetchShopping();
    if (res?.error) {
      showToast("No se pudo actualizar el estado");
      return;
    }
    if (wasOffList && status === "needed") {
      showToast("Agregado a la lista");
    } else {
      showToast(status === "in_cart" ? "Movido a carrito" : status === "purchased" ? "Marcado comprado" : "Pendiente de compra");
    }
  };

  const handleCycleDespensa = async (id: string) => {
    if (cyclingRef.current.has(id)) return;
    cyclingRef.current.add(id);
    try {
      const product = products.find((p) => p.id === id);
      if (!product) return;
      const stage = resolveProductStage(product, statusByProduct);
      const next = nextStage(stage, "despensa");
      if (next === "pantry") {
        await handleSetPantry(id);
      } else if (next === "needed") {
        await handleSetShoppingStatus(id, "needed");
      } else if (next === "in_cart") {
        await handleSetShoppingStatus(id, "in_cart");
      }
    } finally {
      cyclingRef.current.delete(id);
    }
  };

  const handleCycleLista = async (item: ShoppingItem) => {
    if (cyclingRef.current.has(item.id)) return;
    cyclingRef.current.add(item.id);
    try {
      const status = itemStatus(item);
      const next = nextStage(status, "lista");
      if (next === "pantry") {
        await handleSetPantry(item.product_id);
      } else if (next === "needed" || next === "in_cart" || next === "purchased") {
        await setStatus(item.id, next);
      }
    } finally {
      cyclingRef.current.delete(item.id);
    }
  };

  const handleSelectDespensaStage = async (id: string, target: ProductStage) => {
    if (target === "pantry") {
      await handleSetPantry(id);
    } else if (target === "needed" || target === "in_cart" || target === "purchased") {
      await handleSetShoppingStatus(id, target);
    }
  };

  const handleSelectListaStage = async (
    item: ShoppingItem,
    target: ProductStage | ShoppingStatus,
  ) => {
    if (target === "off_list") return;
    if (target === "pantry") {
      await handleSetPantry(item.product_id);
      return;
    }
    await setStatus(item.id, target);
  };

  const handleDeleteProduct = async (p: Product) => {
    const itemSnap = shopping.find((s) => s.product_id === p.id);
    const productSnap = { ...p, category: p.category ? { ...p.category } : undefined };
    await deleteProduct(p.id);
    refetchShopping();
    showUndoToast({
      message: `${p.name} eliminado`,
      durationMs: 10000,
      onUndo: async () => {
        await restoreProduct(productSnap);
        if (itemSnap) {
          const itemCopy = {
            ...itemSnap,
            product: itemSnap.product ? { ...itemSnap.product } : undefined,
          };
          await restoreShoppingItem(itemCopy);
        }
        refetchProducts();
        refetchShopping();
        showToast(`${p.name} restaurado`);
      },
    });
  };

  const handleRemoveFromList = async (s: ShoppingItem) => {
    const itemSnap = {
      ...s,
      product: s.product ? { ...s.product, category: s.product.category ? { ...s.product.category } : undefined } : undefined,
    };
    await removeFromList(s.product_id);
    showUndoToast({
      message: `${s.product?.name ?? "Producto"} quitado de la lista`,
      durationMs: 10000,
      onUndo: async () => {
        await restoreShoppingItem(itemSnap);
        refetchShopping();
        showToast(`${s.product?.name ?? "Producto"} restaurado`);
      },
    });
  };

  const handleShareList = async () => {
    const lines = naturalShopping
      .filter((s) => itemStatus(s) !== "purchased")
      .map((s) => `- ${s.product?.name ?? "?"} x${s.qty} ${s.product?.unit ?? ""} · ${money(s.price)}`);
    const text = `🛒 Lista de compras\n${lines.join("\n")}\n\nEn carrito: ${money(totalInCart)}\nPendiente: ${money(totalNeeded)}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { }
    } else {
      await navigator.clipboard.writeText(text);
      showToast("Lista copiada al portapapeles");
    }
  };

  const handleShareReceipt = async () => {
    const lines = naturalShopping
      .filter((s) => itemStatus(s) === "purchased")
      .map((s) => `- ${s.product?.name ?? "?"} x${s.qty} ${s.product?.unit ?? ""} · ${money(s.price)} = ${money(s.qty * s.price)}`);
    const text = `🧾 Ticket de compra\n${lines.join("\n")}\n\nTotal comprado: ${money(totalPurchased)}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showToast("Ticket copiado al portapapeles");
    }
  };

  const handleMoveAllToCart = async () => {
    if (listNeededCount === 0) return;
    await moveAllToCart();
    showToast(`${listNeededCount} producto(s) al carrito`);
  };

  const handleConfirmCartPurchase = async () => {
    if (listCartCount === 0) return;
    const purchased = await confirmCartPurchase();
    const ids = purchased?.map((s) => s.id) ?? [];
    const productIds = purchased?.map((s) => s.product_id) ?? [];
    const moved = await movePurchasedToPantry({ ids, productIds });
    moved.forEach((s) => {
      patchProduct(s.product_id, { in_stock: true, ref_qty: s.qty, ref_price: s.price });
    });
    showToast(`${listCartCount} producto(s) comprados`);
    refetchProducts();
    refetchHistory();
  };

  const handleMovePurchasedToPantry = async () => {
    if (listPurchasedCount === 0) return;
    const moved = await movePurchasedToPantry();
    moved.forEach((s) => {
      patchProduct(s.product_id, { in_stock: true, ref_qty: s.qty, ref_price: s.price });
    });
    showToast(`${listPurchasedCount} producto(s) pasados a despensa`);
    refetchProducts();
    refetchHistory();
  };

  const handleArchiveTrip = async () => {
    if (listPurchasedCount === 0) return;
    await archivePurchasedTrip();
    showToast(`Visita guardada (${listPurchasedCount} productos)`);
    refetchHistory();
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="h-screen-safe flex flex-col overflow-hidden">
      {/* ═══ DESPENSA VIEW ═══ */}
      {tab === "despensa" && (
        <>
          <header
            className="shrink-0 glass border-b border-[rgba(21,49,49,0.08)] px-[var(--pad,1rem)] py-3"
            style={{ paddingTop: "max(.6rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base font-semibold text-ink">Despensa</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs text-ink-faint tabular-nums">
                  {pantryCount} despensa · {neededCount} pendiente · {cartCount} carrito · {purchasedCount} comprado
                </p>
                <ActionsSideToggle side={actionsSide} onToggle={toggleActionsSide} />
              </div>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-20
            px-[var(--pad,1rem)] pt-2 space-y-2"
            style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}>
            <SearchBar value={search} onChange={setSearch} />
            <FilterChips active={filter} onChange={setFilter} />

            {pLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-brand-200 border-t-brand-500
                  rounded-full animate-spin" />
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
                    <span className="category-label uppercase">
                      {cat}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-ink-faint font-medium">
                      {prods.length}
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${collapsed[`despensa:${cat}`] ? "-rotate-90" : ""}`}
                      />
                    </span>
                  </button>

                  {!collapsed[`despensa:${cat}`] && (
                    <div className="space-y-1.5">
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
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </div>

          {/* FAB */}
          <button
            onClick={() => setShowAdd(true)}
            className="fixed right-4 z-30 w-12 h-12 rounded-full
              bg-brand-500 text-white shadow-md flex items-center justify-center
              transition-all active:scale-95"
            style={{ bottom: "calc(3.8rem + env(safe-area-inset-bottom, 0px) + .6rem)" }}
            aria-label="Agregar producto"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ═══ LISTA VIEW ═══ */}
      {tab === "lista" && (
        <>
          <header
            className="shrink-0 glass border-b border-[rgba(21,49,49,0.08)] px-[var(--pad,1rem)] py-3"
            style={{ paddingTop: "max(.6rem, env(safe-area-inset-top))" }}
          >
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-base font-semibold text-ink">Lista</h1>
              <div className="flex items-center gap-2">
                <p className="text-[.68rem] text-slate-400 tabular-nums">
                  {listNeededCount} pendiente{listNeededCount !== 1 ? "s" : ""} · {listCartCount} carrito
                </p>
                <ActionsSideToggle side={actionsSide} onToggle={toggleActionsSide} />
              </div>
            </div>
          </header>

          <div
            className="shrink-0 px-[var(--pad,1rem)] pt-2 pb-1"
            style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
          >
            <SearchBar
              value={listaSearch}
              onChange={setListaSearch}
              placeholder="Buscar en la lista..."
            />
          </div>

          <div
            className="shrink-0 flex gap-1.5 overflow-x-auto no-scrollbar
              px-[var(--pad,1rem)] py-2 border-b border-slate-50"
            style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}
          >
            <button
              onClick={handleShareList}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md
                bg-brand-500 text-white text-[.72rem] font-medium active:scale-[.97]"
            >
              <Share2 size={13} />
              Compartir
            </button>
            <button
              onClick={handleShareReceipt}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md
                text-brand-600 text-[.72rem] font-medium active:scale-[.97]"
            >
              <ReceiptText size={13} />
              Ticket
            </button>
            <button
              onClick={handleMoveAllToCart}
              disabled={listNeededCount === 0}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md
                text-list text-[.72rem] font-medium active:scale-[.97]
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ShoppingCart size={13} />
              Todo al carrito
            </button>
            <button
              onClick={handleConfirmCartPurchase}
              disabled={listCartCount === 0}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md
                bg-cart text-white text-[.72rem] font-medium active:scale-[.97]
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={13} />
              Comprar del carrito
            </button>
            <button
              onClick={handleArchiveTrip}
              disabled={listPurchasedCount === 0}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md
                text-ink-muted text-[.72rem] font-medium active:scale-[.97]
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Archive size={13} />
              Guardar visita
            </button>
            <button
              onClick={handleMovePurchasedToPantry}
              disabled={listPurchasedCount === 0}
              className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-md
                text-slate-400 text-[.72rem] font-medium active:scale-[.97]
                disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <CheckCircle2 size={13} />
              A despensa
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto
            px-[var(--pad,1rem)] pt-2 space-y-1.5"
            style={{
              "--pad": "clamp(14px, 3.5vw, 22px)",
              paddingBottom: "calc(3.8rem + 4rem + env(safe-area-inset-bottom, 0px) + .5rem)",
            } as React.CSSProperties}>
            {sLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-[3px] border-pink-200 border-t-pink-500
                  rounded-full animate-spin" />
              </div>
            ) : shopping.length === 0 ? (
              <EmptyState
                icon="🛒"
                title="Lista vacia"
                description="Ve a Despensa y marca los productos que faltan para agregarlos aqui."
              />
            ) : groupedShopping.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="Sin resultados"
                description="Intenta con otro termino"
              />
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
                    <div className="space-y-1.5">
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
                        />
                      ))}
                    </div>
                  )}
                </section>
              ))
            )}
          </div>

          {/* Total bar */}
          <div
            className="fixed inset-x-0 glass border-t border-slate-100 z-30
              flex items-center justify-between px-[var(--pad,1rem)] py-2.5 gap-4"
            style={{
              bottom: "calc(3.8rem + env(safe-area-inset-bottom, 0px))",
              "--pad": "clamp(14px, 3.5vw, 22px)",
            } as React.CSSProperties}
          >
            <div>
              <p className="text-[.62rem] text-slate-400">Visita</p>
              <p className="text-lg font-bold text-brand-600 tabular-nums">{money(tripTotal)}</p>
            </div>
            <div className="text-right text-[.62rem] text-slate-400 tabular-nums space-y-0.5">
              <p>✓ {money(totalPurchased)}</p>
              <p>🛒 {money(totalInCart)}</p>
              <p>… {money(totalNeeded)}</p>
            </div>
          </div>

          {/* FAB */}
          <button
            onClick={() => setShowAdd(true)}
            className="fixed right-4 z-30 w-12 h-12 rounded-full
              bg-brand-500 text-white shadow-md flex items-center justify-center
              transition-all active:scale-95"
            style={{ bottom: "calc(7.5rem + env(safe-area-inset-bottom, 0px))" }}
            aria-label="Agregar producto"
          >
            <Plus size={22} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ═══ HISTORIAL VIEW ═══ */}
      {tab === "historial" && (
        <>
          <header
            className="shrink-0 glass border-b border-[rgba(21,49,49,0.08)] px-[var(--pad,1rem)] py-3"
            style={{ paddingTop: "max(.6rem, env(safe-area-inset-top))" }}
          >
            <h1 className="text-base font-semibold text-ink">Historial</h1>
            <p className="text-[.68rem] text-ink-faint mt-0.5">Compras archivadas</p>
          </header>

          <div
            className="flex-1 min-h-0 overflow-y-auto pb-20 px-[var(--pad,1rem)] pt-2"
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
      )}

      {/* ═══ SHARED ═══ */}
      <BottomNav active={tab} onChange={handleTabChange} badge={shopping.length} />
      <Toast />
      {showAdd && (
        <AddProductModal
          categories={categories}
          onAdd={handleAddProduct}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
