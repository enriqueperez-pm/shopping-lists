"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCategories, useProducts, useShopping, usePurchaseHistory } from "@/lib/hooks";
import type { Product, ShoppingItem, ShoppingStatus } from "@/lib/types";
import { itemStatus } from "@/lib/purchase";
import { showToast, showUndoToast } from "@/components/Toast";
import {
  groupProductsByCategory,
  groupShoppingByCategory,
  flattenGrouped,
} from "@/lib/grouping";
import { resolveProductStage, buildStatusMap, nextStage, type ProductStage } from "@/lib/productStage";
import { useCardLayout } from "@/lib/useCardLayout";
import { useItemDensity } from "@/lib/useItemDensity";
import { useTripBudget } from "@/lib/useTripBudget";
import { money } from "@/lib/money";
import {
  readShoppingUiState,
  writeShoppingUiState,
  type ShoppingFilter,
  type ShoppingUiState,
} from "./shopping-ui-state";

type ShoppingContextValue = {
  categories: ReturnType<typeof useCategories>;
  products: Product[];
  pLoading: boolean;
  shopping: ShoppingItem[];
  sLoading: boolean;
  trips: ReturnType<typeof usePurchaseHistory>["trips"];
  hLoading: boolean;
  search: string;
  setSearch: (v: string) => void;
  listaSearch: string;
  setListaSearch: (v: string) => void;
  filter: ShoppingFilter;
  setFilter: (v: ShoppingFilter) => void;
  collapsed: Record<string, boolean>;
  toggleCollapse: (cat: string) => void;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
  actionsSide: ReturnType<typeof useCardLayout>["actionsSide"];
  toggleActionsSide: ReturnType<typeof useCardLayout>["toggleActionsSide"];
  density: ReturnType<typeof useItemDensity>["density"];
  toggleDensity: ReturnType<typeof useItemDensity>["toggleDensity"];
  isCompact: boolean;
  budget: number | null;
  setBudget: (amount: number | null) => void;
  statusByProduct: ReturnType<typeof buildStatusMap>;
  filteredProducts: Product[];
  grouped: ReturnType<typeof groupProductsByCategory>;
  pantryCount: number;
  neededCount: number;
  cartCount: number;
  purchasedCount: number;
  listNeededCount: number;
  listCartCount: number;
  listPurchasedCount: number;
  filteredShopping: ShoppingItem[];
  groupedShopping: ReturnType<typeof groupShoppingByCategory>;
  naturalShopping: ShoppingItem[];
  totalNeeded: number;
  totalInCart: number;
  totalPurchased: number;
  tripTotal: number;
  badge: number;
  handleAddProduct: (p: {
    name: string;
    category_id: number;
    ref_price: number;
    unit: string;
    ref_qty: number;
  }) => Promise<void>;
  handleSetPantry: (id: string) => Promise<void>;
  handleSetShoppingStatus: (id: string, status: ShoppingStatus) => Promise<void>;
  handleCycleDespensa: (id: string) => Promise<void>;
  handleCycleLista: (item: ShoppingItem) => Promise<void>;
  handleSelectDespensaStage: (id: string, target: ProductStage) => Promise<void>;
  handleSelectListaStage: (item: ShoppingItem, target: ProductStage | ShoppingStatus) => Promise<void>;
  handleDeleteProduct: (p: Product) => Promise<void>;
  handleRemoveFromList: (s: ShoppingItem) => Promise<void>;
  handleShareList: () => Promise<void>;
  handleShareReceipt: () => Promise<void>;
  handleMoveAllToCart: () => Promise<void>;
  handleConfirmCartPurchase: () => Promise<void>;
  handleMovePurchasedToPantry: () => Promise<void>;
  handleArchiveTrip: () => Promise<void>;
  updateProduct: ReturnType<typeof useProducts>["updateProduct"];
  updateQty: ReturnType<typeof useShopping>["updateQty"];
  updatePrice: ReturnType<typeof useShopping>["updatePrice"];
  updateUnit: ReturnType<typeof useShopping>["updateUnit"];
  refetchProducts: () => Promise<void>;
  refetchShopping: () => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
};

const ShoppingContext = createContext<ShoppingContextValue | null>(null);

export function useShoppingContext() {
  const ctx = useContext(ShoppingContext);
  if (!ctx) throw new Error("useShoppingContext must be used within ShoppingProvider");
  return ctx;
}

export default function ShoppingProvider({ children }: { children: ReactNode }) {
  const initialUi = useMemo(() => readShoppingUiState(), []);
  const [search, setSearch] = useState(initialUi?.search ?? "");
  const [listaSearch, setListaSearch] = useState(initialUi?.listaSearch ?? "");
  const [filter, setFilter] = useState<ShoppingFilter>(initialUi?.filter ?? "all");
  const [showAdd, setShowAdd] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialUi?.collapsed ?? {});
  const { actionsSide, toggleActionsSide } = useCardLayout();
  const { density, toggleDensity, isCompact } = useItemDensity();
  const { budget, setBudget } = useTripBudget();

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
  const { trips, loading: hLoading, refetch: refetchHistory, deleteTrip } = usePurchaseHistory();

  useEffect(() => {
    const next: ShoppingUiState = { search, listaSearch, filter, collapsed };
    writeShoppingUiState(next);
  }, [search, listaSearch, filter, collapsed]);

  const statusByProduct = useMemo(() => buildStatusMap(shopping), [shopping]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => {
      const stage = resolveProductStage(p, statusByProduct);
      if (filter === "pantry" && stage !== "pantry") return false;
      if (filter === "needed" && stage !== "needed") return false;
      if (filter === "in_cart" && stage !== "in_cart") return false;
      if (filter === "purchased" && stage !== "purchased") return false;
      if (q && !p.name.toLowerCase().includes(q) && !(p.category?.name ?? "").toLowerCase().includes(q))
        return false;
      return true;
    });
  }, [products, statusByProduct, search, filter]);

  const grouped = useMemo(() => groupProductsByCategory(filteredProducts), [filteredProducts]);

  const pantryCount = products.filter((p) => p.in_stock).length;
  const neededCount = products.filter(
    (p) => resolveProductStage(p, statusByProduct) === "needed",
  ).length;
  const cartCount = products.filter((p) => resolveProductStage(p, statusByProduct) === "in_cart").length;
  const purchasedCount = products.filter(
    (p) => resolveProductStage(p, statusByProduct) === "purchased",
  ).length;

  const listNeededCount = shopping.filter((s) => itemStatus(s) === "needed").length;
  const listCartCount = shopping.filter((s) => itemStatus(s) === "in_cart").length;
  const listPurchasedCount = shopping.filter((s) => itemStatus(s) === "purchased").length;

  const filteredShopping = useMemo(() => {
    const q = listaSearch.toLowerCase();
    if (!q) return shopping;
    return shopping.filter((s) => {
      const name = s.product?.name ?? "";
      const cat = s.product?.category?.name ?? "";
      return name.toLowerCase().includes(q) || cat.toLowerCase().includes(q);
    });
  }, [shopping, listaSearch]);

  const groupedShopping = useMemo(() => groupShoppingByCategory(filteredShopping), [filteredShopping]);
  const naturalShopping = useMemo(() => flattenGrouped(groupedShopping), [groupedShopping]);

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

  const handleAddProduct = async (p: {
    name: string;
    category_id: number;
    ref_price: number;
    unit: string;
    ref_qty: number;
  }) => {
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
      showToast(
        status === "in_cart"
          ? "Movido a carrito"
          : status === "purchased"
            ? "Marcado comprado"
            : "Pendiente de compra",
      );
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
      if (next === "pantry") await handleSetPantry(id);
      else if (next === "needed") await handleSetShoppingStatus(id, "needed");
      else if (next === "in_cart") await handleSetShoppingStatus(id, "in_cart");
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
      if (next === "pantry") await handleSetPantry(item.product_id);
      else if (next === "needed" || next === "in_cart" || next === "purchased") {
        await setStatus(item.id, next);
      }
    } finally {
      cyclingRef.current.delete(item.id);
    }
  };

  const handleSelectDespensaStage = async (id: string, target: ProductStage) => {
    if (target === "pantry") await handleSetPantry(id);
    else if (target === "needed" || target === "in_cart" || target === "purchased") {
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
      product: s.product
        ? { ...s.product, category: s.product.category ? { ...s.product.category } : undefined }
        : undefined,
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
      try {
        await navigator.share({ text });
      } catch {
        /* cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
      showToast("Lista copiada al portapapeles");
    }
  };

  const handleShareReceipt = async () => {
    const lines = naturalShopping
      .filter((s) => itemStatus(s) === "purchased")
      .map(
        (s) =>
          `- ${s.product?.name ?? "?"} x${s.qty} ${s.product?.unit ?? ""} · ${money(s.price)} = ${money(s.qty * s.price)}`,
      );
    const text = `🧾 Ticket de compra\n${lines.join("\n")}\n\nTotal comprado: ${money(totalPurchased)}`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
      } catch {
        /* cancelled */
      }
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
    const count = listCartCount;
    const result = await confirmCartPurchase();
    const purchased = result?.items;
    const undoFinance = result?.undo;
    if (!purchased) return;
    const ids = purchased.map((s) => s.id);
    const productIds = purchased.map((s) => s.product_id);
    const moved = await movePurchasedToPantry({ ids, productIds });
    moved.forEach((s) => {
      patchProduct(s.product_id, { in_stock: true, ref_qty: s.qty, ref_price: s.price });
    });
    showUndoToast({
      message: `${count} producto(s) comprados`,
      durationMs: 10000,
      onUndo: async () => {
        if (undoFinance) await undoFinance();
        refetchProducts();
        refetchShopping();
        refetchHistory();
        showToast("Compra revertida");
      },
    });
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

  const toggleCollapse = useCallback((cat: string) => {
    setCollapsed((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }, []);

  const value: ShoppingContextValue = {
    categories,
    products,
    pLoading,
    shopping,
    sLoading,
    trips,
    hLoading,
    search,
    setSearch,
    listaSearch,
    setListaSearch,
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
    budget,
    setBudget,
    statusByProduct,
    filteredProducts,
    grouped,
    pantryCount,
    neededCount,
    cartCount,
    purchasedCount,
    listNeededCount,
    listCartCount,
    listPurchasedCount,
    filteredShopping,
    groupedShopping,
    naturalShopping,
    totalNeeded,
    totalInCart,
    totalPurchased,
    tripTotal,
    badge: shopping.length,
    handleAddProduct,
    handleSetPantry,
    handleSetShoppingStatus,
    handleCycleDespensa,
    handleCycleLista,
    handleSelectDespensaStage,
    handleSelectListaStage,
    handleDeleteProduct,
    handleRemoveFromList,
    handleShareList,
    handleShareReceipt,
    handleMoveAllToCart,
    handleConfirmCartPurchase,
    handleMovePurchasedToPantry,
    handleArchiveTrip,
    updateProduct,
    updateQty,
    updatePrice,
    updateUnit,
    refetchProducts,
    refetchShopping,
    deleteTrip,
  };

  return <ShoppingContext.Provider value={value}>{children}</ShoppingContext.Provider>;
}
