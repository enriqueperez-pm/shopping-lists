"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { Category, Product, ShoppingItem } from "./types";

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
    const { data, error } = await supabase.from("products").insert(p).select("*, category:categories(*)").single();
    if (!error && data) {
      setProducts((prev) => [...prev, data as Product]);
      // Auto-add to shopping if not in stock
      await supabase.from("shopping_items").insert({
        product_id: data.id,
        qty: p.ref_qty,
        price: p.ref_price,
      });
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

  const toggleStock = async (id: string, inStock: boolean) => {
    await supabase.from("products").update({ in_stock: inStock }).eq("id", id);
    if (inStock) {
      // Remove from shopping list
      await supabase.from("shopping_items").delete().eq("product_id", id);
    } else {
      // Add to shopping list
      const p = products.find((x) => x.id === id);
      if (p) {
        await supabase.from("shopping_items").upsert({
          product_id: id,
          qty: p.ref_qty,
          price: p.ref_price,
        }, { onConflict: "product_id" });
      }
    }
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, in_stock: inStock } : p)));
  };

  const deleteProduct = async (id: string) => {
    await supabase.from("products").delete().eq("id", id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return { products, loading, addProduct, updateProduct, toggleStock, deleteProduct, refetch: fetch };
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

  const toggleCheck = async (id: string, checked: boolean) => {
    await supabase.from("shopping_items").update({ checked }).eq("id", id);
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, checked } : s)));
  };

  const updateQty = async (id: string, qty: number) => {
    await supabase.from("shopping_items").update({ qty }).eq("id", id);
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, qty } : s)));
  };

  const updatePrice = async (id: string, price: number) => {
    await supabase.from("shopping_items").update({ price }).eq("id", id);
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, price } : s)));
  };

  const removeItem = async (id: string, productId: string) => {
    await supabase.from("shopping_items").delete().eq("id", id);
    // Mark product as in stock
    await supabase.from("products").update({ in_stock: true }).eq("id", productId);
    setItems((prev) => prev.filter((s) => s.id !== id));
  };

  const clearChecked = async () => {
    const checked = items.filter((s) => s.checked);
    const ids = checked.map((s) => s.id);
    const productIds = checked.map((s) => s.product_id);
    if (ids.length === 0) return;
    await supabase.from("shopping_items").delete().in("id", ids);
    // Mark those products as in stock
    await supabase.from("products").update({ in_stock: true }).in("id", productIds);
    setItems((prev) => prev.filter((s) => !s.checked));
  };

  return { items, loading, toggleCheck, updateQty, updatePrice, removeItem, clearChecked, refetch: fetch };
}
