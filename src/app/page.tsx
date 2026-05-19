"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Share2, Trash2, CheckCircle2, ChevronDown } from "lucide-react";
import { useCategories, useProducts, useShopping } from "@/lib/hooks";
import BottomNav from "@/components/BottomNav";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import ProductCard from "@/components/ProductCard";
import ShopItem from "@/components/ShopItem";
import AddProductModal from "@/components/AddProductModal";
import EmptyState from "@/components/EmptyState";
import Toast, { showToast } from "@/components/Toast";

type Tab = "despensa" | "lista";
type Filter = "all" | "needs" | "stock";

function money(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("despensa");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const categories = useCategories();
  const { products, loading: pLoading, addProduct, updateProduct, toggleStock, deleteProduct, refetch: refetchProducts } = useProducts();
  const { items: shopping, loading: sLoading, toggleCheck, updateQty, updatePrice, removeItem, clearChecked, refetch: refetchShopping } = useShopping();

  // When switching to lista, refetch to get latest
  const handleTabChange = useCallback((t: Tab) => {
    setTab(t);
    if (t === "lista") refetchShopping();
    else refetchProducts();
  }, [refetchShopping, refetchProducts]);

  // ── Despensa logic ──
  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      if (filter === "stock" && !p.in_stock) return false;
      if (filter === "needs" && p.in_stock) return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.category?.name ?? "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, search, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredProducts>();
    for (const p of filteredProducts) {
      const cat = p.category?.name ?? "Otros";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    // Sort by category sort_order
    return [...map.entries()].sort((a, b) => {
      const aOrder = filteredProducts.find((p) => p.category?.name === a[0])?.category?.sort_order ?? 999;
      const bOrder = filteredProducts.find((p) => p.category?.name === b[0])?.category?.sort_order ?? 999;
      return aOrder - bOrder;
    });
  }, [filteredProducts]);

  const stockCount = products.filter((p) => p.in_stock).length;
  const needsCount = products.filter((p) => !p.in_stock).length;

  // ── Lista logic ──
  const sortedShopping = useMemo(() => {
    return [...shopping].sort((a, b) => {
      // Unchecked first
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      // Then by category
      const catA = a.product?.category?.sort_order ?? 999;
      const catB = b.product?.category?.sort_order ?? 999;
      return catA - catB;
    });
  }, [shopping]);

  const total = shopping.reduce((sum, s) => sum + s.qty * s.price, 0);
  const checkedCount = shopping.filter((s) => s.checked).length;
  const uncheckedCount = shopping.length - checkedCount;

  // ── Handlers ──
  const handleAddProduct = async (p: { name: string; category_id: number; ref_price: number; unit: string; ref_qty: number }) => {
    const { error } = await addProduct(p);
    if (!error) {
      setShowAdd(false);
      showToast(`${p.name} agregado`);
      refetchShopping();
    }
  };

  const handleToggleStock = async (id: string, inStock: boolean) => {
    await toggleStock(id, inStock);
    showToast(inStock ? "Marcado en casa" : "Agregado a la lista");
    refetchShopping();
  };

  const handleShareList = async () => {
    const lines = sortedShopping
      .filter((s) => !s.checked)
      .map((s) => `- ${s.product?.name ?? "?"} x${s.qty} ${s.product?.unit ?? ""} · ${money(s.price)}`);
    const text = `🛒 Lista de compras\n${lines.join("\n")}\n\nTotal: ${money(total)}`;
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      showToast("Lista copiada al portapapeles");
    }
  };

  const handleClearChecked = async () => {
    if (checkedCount === 0) return;
    await clearChecked();
    showToast(`${checkedCount} articulo(s) completados`);
    refetchProducts();
  };

  const toggleCollapse = (cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="h-screen-safe flex flex-col overflow-hidden">
      {/* ═══ DESPENSA VIEW ═══ */}
      {tab === "despensa" && (
        <>
          {/* Hero */}
          <header className="shrink-0 bg-gradient-to-br from-white via-brand-50/40 to-white
            border-b border-brand-100/60 px-[var(--pad,1rem)] py-4"
            style={{ paddingTop: "max(.75rem, env(safe-area-inset-top))" }}>
            <p className="text-[.6rem] font-semibold uppercase tracking-[.12em] text-slate-400 mb-1.5">
              Despensa
            </p>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
              Control de inventario
            </h1>
            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold
                bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1.5">
                ✓ {stockCount} en casa
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold
                bg-brand-50 text-brand-700 border border-brand-200 rounded-full px-3 py-1.5">
                🛒 {needsCount} faltan
              </span>
            </div>
          </header>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto pb-20
            px-[var(--pad,1rem)] pt-3 space-y-3"
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
                    onClick={() => toggleCollapse(cat)}
                    className="flex items-center justify-between w-full py-2.5 px-1
                      border-b border-slate-200/80 mb-3 touch-target"
                    aria-expanded={!collapsed[cat]}
                    aria-label={`Categoria ${cat}, ${prods.length} productos`}
                  >
                    <span className="flex items-center gap-2 text-[.66rem] font-bold
                      uppercase tracking-[.1em] text-cyan-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-br from-cyan-300 to-cyan-600" />
                      {cat}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold">
                      {prods.length}
                      <ChevronDown
                        size={14}
                        className={`transition-transform ${collapsed[cat] ? "-rotate-90" : ""}`}
                      />
                    </span>
                  </button>

                  {!collapsed[cat] && (
                    <div className="space-y-3">
                      {prods.map((p) => (
                        <ProductCard
                          key={p.id}
                          product={p}
                          categories={categories}
                          onToggleStock={(inStock) => handleToggleStock(p.id, inStock)}
                          onUpdate={(updates) => updateProduct(p.id, updates)}
                          onDelete={() => { deleteProduct(p.id); showToast("Producto eliminado"); refetchShopping(); }}
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
            className="fixed right-4 z-30 w-14 h-14 rounded-full
              bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700
              text-white shadow-float flex items-center justify-center
              transition-all active:scale-95 hover:shadow-lg touch-target"
            style={{ bottom: "calc(3.8rem + env(safe-area-inset-bottom, 0px) + .6rem)" }}
            aria-label="Agregar producto"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </>
      )}

      {/* ═══ LISTA VIEW ═══ */}
      {tab === "lista" && (
        <>
          {/* Hero */}
          <header className="shrink-0 bg-gradient-to-br from-white via-pink-50/40 to-white
            border-b border-pink-100/60 px-[var(--pad,1rem)] py-4"
            style={{ paddingTop: "max(.75rem, env(safe-area-inset-top))" }}>
            <p className="text-[.6rem] font-semibold uppercase tracking-[.12em] text-slate-400 mb-1.5">
              🛒 Lista de compras
            </p>
            <h1 className="text-xl font-extrabold text-pink-600 tracking-tight mb-1">
              {uncheckedCount} articulo{uncheckedCount !== 1 ? "s" : ""} por comprar
            </h1>
            <p className="text-[.78rem] text-slate-500">
              Cantidad, precio unitario e importe
            </p>
          </header>

          {/* Toolbar */}
          <div className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar
            px-[var(--pad,1rem)] py-2.5 border-b border-slate-100"
            style={{ "--pad": "clamp(14px, 3.5vw, 22px)" } as React.CSSProperties}>
            <button
              onClick={handleShareList}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full
                bg-gradient-to-r from-brand-500 to-brand-600 text-white
                text-[.76rem] font-bold shadow-float touch-target active:scale-[.97]"
            >
              <Share2 size={14} />
              Compartir
            </button>
            <button
              onClick={handleClearChecked}
              disabled={checkedCount === 0}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full
                border-[1.5px] border-slate-200 bg-white text-slate-500
                text-[.76rem] font-semibold touch-target active:scale-[.97]
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:border-emerald-300 hover:text-emerald-600 transition"
            >
              <CheckCircle2 size={14} />
              Completar tachados
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 min-h-0 overflow-y-auto
            px-[var(--pad,1rem)] pt-3 space-y-3"
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
            ) : (
              sortedShopping.map((s) => (
                <ShopItem
                  key={s.id}
                  item={s}
                  onToggleCheck={(checked) => toggleCheck(s.id, checked)}
                  onUpdateQty={(qty) => updateQty(s.id, qty)}
                  onUpdatePrice={(price) => updatePrice(s.id, price)}
                  onRemove={() => { removeItem(s.id, s.product_id); showToast("Quitado de la lista"); refetchProducts(); }}
                />
              ))
            )}
          </div>

          {/* Total bar */}
          <div className="fixed inset-x-0 glass border-t border-slate-200/80 z-30
            flex items-center justify-between px-[var(--pad,1rem)] py-3 gap-4"
            style={{
              bottom: "calc(3.8rem + env(safe-area-inset-bottom, 0px))",
              "--pad": "clamp(14px, 3.5vw, 22px)",
            } as React.CSSProperties}>
            <div>
              <p className="text-[.62rem] font-semibold uppercase tracking-[.08em] text-slate-400 mb-0.5">
                Subtotal estimado
              </p>
              <p className="text-xl font-extrabold text-brand-600 tracking-tight tabular-nums leading-tight">
                {money(total)}
              </p>
            </div>
            {checkedCount > 0 && (
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50
                border border-emerald-200 rounded-full px-3 py-1.5">
                {checkedCount} ✓
              </span>
            )}
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
