"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { itemStatus, recordPurchaseTrip } from "./purchase";
import { clampQty, clampQtyInt } from "./qty";
import type { Category, Product, PurchaseTrip, ShoppingItem, ShoppingStatus } from "./types";

/* ── Categories ── */
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from("categories")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  return categories;
}

/* ── Products (Despensa) ── */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*, category:categories(*)")
      .order("name");
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const addProduct = async (p: {
    name: string;
    category_id: number;
    ref_price: number;
    unit: string;
    ref_qty: number;
  }) => {
    const { data, error } = await supabase.from("products").insert({
      ...p,
      in_stock: false,
    }).select("*, category:categories(*)").single();
    if (!error && data) {
      setProducts((prev) => [...prev, data as Product]);
      const insertPayload = {
        product_id: data.id,
        qty: p.ref_qty,
        price: p.ref_price,
        status: "needed" as ShoppingStatus,
        checked: false,
      };
      const insertRes = await supabase.from("shopping_items").insert(insertPayload);
      if (insertRes.error) {
        await supabase.from("shopping_items").insert({
          product_id: data.id,
          qty: p.ref_qty,
          price: p.ref_price,
          checked: false,
        });
      }
    }
    return { data, error };
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await supabase.from("products").update(updates).eq("id", id);
    if (!error) {
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
    }
    return { error };
  };

  const setPantry = async (id: string, inStock: boolean) => {
    const productRes = await supabase.from("products").update({ in_stock: inStock }).eq("id", id);
    if (productRes.error) {
      await fetch();
      return { error: productRes.error };
    }
    const { data: product } = await supabase
      .from("products")
      .select("ref_qty, ref_price")
      .eq("id", id)
      .single();

    if (inStock) {
      const delRes = await supabase.from("shopping_items").delete().eq("product_id", id);
      if (delRes.error) {
        await fetch();
        return { error: delRes.error };
      }
    } else if (product) {
      const upsertPayload = {
        product_id: id,
        qty: product.ref_qty,
        price: product.ref_price,
        status: "needed" as ShoppingStatus,
        checked: false,
      };
      const upsertRes = await supabase
        .from("shopping_items")
        .upsert(upsertPayload, { onConflict: "product_id" });
      if (upsertRes.error) {
        const legacyRes = await supabase.from("shopping_items").upsert(
          { product_id: id, qty: product.ref_qty, price: product.ref_price, checked: false },
          { onConflict: "product_id" },
        );
        if (legacyRes.error) {
          await fetch();
          return { error: legacyRes.error };
        }
      }
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, in_stock: inStock } : p)));
    return { error: null };
  };

  const setShoppingStatusForProduct = async (id: string, status: ShoppingStatus) => {
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, in_stock: false } : x)));

    const { data: product } = await supabase
      .from("products")
      .select("ref_qty, ref_price")
      .eq("id", id)
      .single();
    if (!product) return;

    const productRes = await supabase.from("products").update({ in_stock: false }).eq("id", id);
    if (productRes.error) {
      await fetch();
      return { error: productRes.error };
    }
    const payload = {
      product_id: id,
      qty: product.ref_qty,
      price: product.ref_price,
      status,
      checked: status === "purchased",
    };
    const upsertRes = await supabase
      .from("shopping_items")
      .upsert(payload, { onConflict: "product_id" });
    if (upsertRes.error) {
      const legacyRes = await supabase.from("shopping_items").upsert(
        {
          product_id: id,
          qty: product.ref_qty,
          price: product.ref_price,
          checked: status === "purchased",
        },
        { onConflict: "product_id" },
      );
      if (legacyRes.error) {
        await fetch();
        return { error: legacyRes.error };
      }
    }
    setProducts((prev) => prev.map((x) => (x.id === id ? { ...x, in_stock: false } : x)));
    return { error: null };
  };

  const restoreProduct = async (product: Product) => {
    const { category: _cat, ...row } = product;
    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select("*, category:categories(*)")
      .single();
    if (!error && data) {
      setProducts((prev) => [...prev, data as Product]);
    }
    return { data, error };
  };

  const patchProduct = (id: string, updates: Partial<Product>) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return {
    products,
    loading,
    addProduct,
    updateProduct,
    patchProduct,
    setPantry,
    setShoppingStatusForProduct,
    deleteProduct,
    restoreProduct,
    refetch: fetch,
  };
}

/* ── Shopping list ── */
export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("shopping_items")
      .select("*, product:products(*, category:categories(*))")
      .order("created_at");
    setItems((data as ShoppingItem[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const patchItemForProduct = (
    productId: string,
    status: ShoppingStatus,
    product: Product,
  ) => {
    setItems((prev) => {
      const existing = prev.find((s) => s.product_id === productId);
      const patch = {
        status,
        checked: status === "purchased",
        qty: product.ref_qty,
        price: product.ref_price,
      };
      if (existing) {
        return prev.map((s) =>
          s.product_id === productId ? { ...s, ...patch } : s,
        );
      }
      const now = new Date().toISOString();
      return [
        ...prev,
        {
          id: `optimistic-${productId}`,
          product_id: productId,
          product: { ...product, in_stock: false },
          weight_grams: null,
          created_at: now,
          updated_at: now,
          ...patch,
        },
      ];
    });
  };

  const removeItemOptimistic = (productId: string) => {
    setItems((prev) => prev.filter((s) => s.product_id !== productId));
  };

  const setStatus = async (id: string, status: ShoppingStatus) => {
    const current = items.find((s) => s.id === id);
    if (!current) return;
    setItems((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status, checked: status === "purchased" } : s,
      ),
    );
    if (id.startsWith("optimistic-")) {
      const upsertRes = await supabase.from("shopping_items").upsert(
        {
          product_id: current.product_id,
          qty: current.qty,
          price: current.price,
          status,
          checked: status === "purchased",
        },
        { onConflict: "product_id" },
      );
      if (upsertRes.error) await fetch();
      return;
    }
    const updateRes = await supabase
      .from("shopping_items")
      .update({ status, checked: status === "purchased" })
      .eq("id", id)
      .select("id");
    if (updateRes.error || !updateRes.data || updateRes.data.length === 0) {
      const upsertRes = await supabase.from("shopping_items").upsert(
        {
          product_id: current.product_id,
          qty: current.qty,
          price: current.price,
          status,
          checked: status === "purchased",
        },
        { onConflict: "product_id" },
      );
      if (upsertRes.error) {
        const legacyRes = await supabase.from("shopping_items").update({ checked: status === "purchased" }).eq("id", id);
        if (legacyRes.error) await fetch();
      }
    }
  };

  const setStatusBatch = async (ids: string[], status: ShoppingStatus) => {
    if (ids.length === 0) return;
    const targets = items.filter((s) => ids.includes(s.id));
    const updateRes = await supabase
      .from("shopping_items")
      .update({ status, checked: status === "purchased" })
      .in("id", ids);
    if (updateRes.error) {
      const legacyRes = await supabase
        .from("shopping_items")
        .update({ checked: status === "purchased" })
        .in("id", ids);
      if (legacyRes.error) {
        for (const s of targets) {
          await supabase.from("shopping_items").upsert(
            {
              product_id: s.product_id,
              qty: s.qty,
              price: s.price,
              status,
              checked: status === "purchased",
            },
            { onConflict: "product_id" },
          );
        }
      }
    }
    setItems((prev) =>
      prev.map((s) =>
        ids.includes(s.id) ? { ...s, status, checked: status === "purchased" } : s,
      ),
    );
  };

  const updateQty = async (id: string, qty: number) => {
    const item = items.find((s) => s.id === id);
    const clamped = item?.product?.unit === "pz" ? clampQtyInt(qty) : clampQty(qty);
    const updateRes = await supabase.from("shopping_items").update({ qty: clamped }).eq("id", id);
    if (updateRes.error) {
      await fetch();
      return;
    }
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, qty: clamped } : s)));
  };

  const updatePrice = async (id: string, price: number) => {
    const updateRes = await supabase.from("shopping_items").update({ price }).eq("id", id);
    if (updateRes.error) {
      await fetch();
      return;
    }
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
  };

  const updateUnit = async (id: string, productId: string, unit: string) => {
    const updateRes = await supabase.from("products").update({ unit }).eq("id", productId);
    if (updateRes.error) {
      await fetch();
      return;
    }
    setItems((prev) =>
      prev.map((s) =>
        s.id === id && s.product
          ? { ...s, product: { ...s.product, unit } }
          : s,
      ),
    );
  };

  const removeItem = async (id: string, productId: string) => {
    await supabase.from("shopping_items").delete().eq("id", id);
    await supabase.from("products").update({ in_stock: false }).eq("id", productId);
    setItems((prev) => prev.filter((s) => s.id !== id));
  };

  const removeFromList = async (productId: string) => {
    const deleteRes = await supabase.from("shopping_items").delete().eq("product_id", productId);
    if (deleteRes.error) {
      await fetch();
      return;
    }
    setItems((prev) => prev.filter((s) => s.product_id !== productId));
  };

  const restoreShoppingItem = async (item: ShoppingItem) => {
    const { product: _p, ...row } = item;
    const payload = {
      product_id: row.product_id,
      qty: row.qty,
      price: row.price,
      status: row.status ?? (row.checked ? "purchased" : "needed"),
      checked: row.checked ?? false,
      weight_grams: row.weight_grams,
    };
    const insertRes = await supabase
      .from("shopping_items")
      .insert(payload)
      .select("*, product:products(*, category:categories(*))")
      .single();
    if (insertRes.error) {
      const { status: _st, ...legacy } = payload;
      const legacyRes = await supabase
        .from("shopping_items")
        .insert(legacy)
        .select("*, product:products(*, category:categories(*))")
        .single();
      if (!legacyRes.error && legacyRes.data) {
        setItems((prev) => [...prev, legacyRes.data as ShoppingItem]);
      }
      return legacyRes;
    }
    if (insertRes.data) {
      setItems((prev) => [...prev, insertRes.data as ShoppingItem]);
    }
    return insertRes;
  };

  const moveAllToCart = async () => {
    const needed = items.filter((s) => itemStatus(s) === "needed");
    const ids = needed.map((s) => s.id);
    await setStatusBatch(ids, "in_cart");
  };

  const confirmCartPurchase = async () => {
    const inCart = items.filter((s) => itemStatus(s) === "in_cart");
    if (inCart.length === 0) return null;
    await recordPurchaseTrip(inCart);
    const ids = inCart.map((s) => s.id);
    await setStatusBatch(ids, "purchased");
    return inCart;
  };

  const movePurchasedToPantry = async (opts?: { ids?: string[]; productIds?: string[] }) => {
    const purchased = items.filter((s) => itemStatus(s) === "purchased");
    const ids = opts?.ids ?? purchased.map((s) => s.id);
    const productIds = opts?.productIds ?? purchased.map((s) => s.product_id);
    if (ids.length === 0) return [];
    let moved = purchased.filter((s) => ids.includes(s.id));
    if (moved.length === 0) {
      const snapshotRes = await supabase
        .from("shopping_items")
        .select("id, product_id, qty, price")
        .in("id", ids);
      if (!snapshotRes.error && snapshotRes.data) {
        moved = snapshotRes.data.map((row) => ({
          ...row,
          checked: true,
          status: "purchased",
        })) as ShoppingItem[];
      }
    }
    const deleteRes = await supabase.from("shopping_items").delete().in("id", ids);
    if (deleteRes.error) {
      await fetch();
      return [];
    }
    if (moved.length > 0) {
      await Promise.all(
        moved.map((s) =>
          supabase
            .from("products")
            .update({
              in_stock: true,
              ref_qty: s.qty,
              ref_price: s.price,
              ...(s.product?.unit ? { unit: s.product.unit } : {}),
            })
            .eq("id", s.product_id),
        ),
      );
    } else {
      await supabase.from("products").update({ in_stock: true }).in("id", productIds);
    }
    setItems((prev) => prev.filter((s) => !ids.includes(s.id)));
    return moved;
  };

  const archivePurchasedTrip = async () => {
    const purchased = items.filter((s) => itemStatus(s) === "purchased");
    if (purchased.length === 0) return null;
    const ids = purchased.map((s) => s.id);
    await supabase.from("shopping_items").delete().in("id", ids);
    setItems((prev) => prev.filter((s) => !ids.includes(s.id)));
    return purchased;
  };

  return {
    items,
    loading,
    setStatus,
    updateQty,
    updatePrice,
    updateUnit,
    removeItem,
    removeFromList,
    patchItemForProduct,
    removeItemOptimistic,
    restoreShoppingItem,
    moveAllToCart,
    confirmCartPurchase,
    movePurchasedToPantry,
    archivePurchasedTrip,
    refetch: fetch,
  };
}

/* ── Purchase history ── */
export function usePurchaseHistory() {
  const [trips, setTrips] = useState<PurchaseTrip[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from("purchase_trips")
      .select("*, items:purchase_trip_items(*)")
      .order("purchased_at", { ascending: false });
    setTrips((data as PurchaseTrip[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const deleteTrip = async (id: string) => {
    await supabase.from("purchase_trips").delete().eq("id", id);
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  return { trips, loading, refetch: fetch, deleteTrip };
}
