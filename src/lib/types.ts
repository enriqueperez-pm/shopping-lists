/* ── Supabase generated-style types (manual, matches schema.sql) ── */

export interface Category {
  id: number;
  name: string;
  sort_order: number;
}

export interface Product {
  id: string;
  name: string;
  category_id: number | null;
  ref_price: number;
  unit: string;
  ref_qty: number;
  in_stock: boolean;
  created_at: string;
  updated_at: string;
  // joined
  category?: Category;
}

export type ShoppingStatus = "needed" | "in_cart" | "purchased";

export interface ShoppingItem {
  id: string;
  product_id: string;
  qty: number;
  price: number;
  checked?: boolean;
  status?: ShoppingStatus;
  weight_grams: number | null;
  created_at: string;
  updated_at: string;
  // joined
  product?: Product;
}

export interface PurchaseTrip {
  id: string;
  total: number;
  item_count: number;
  note: string | null;
  budget_tx_id?: string | null;
  purchased_at: string;
  created_at: string;
  items?: PurchaseTripItem[];
}

export interface PurchaseTripItem {
  id: string;
  trip_id: string;
  product_id: string | null;
  product_name: string;
  category_name: string | null;
  qty: number;
  unit: string;
  price: number;
  line_total: number;
}

/* Supabase Database helper — typed enough for supabase-js generics */
export type Database = {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, "id"> & { id?: number };
        Update: Partial<Omit<Category, "id">>;
      };
      products: {
        Row: Product;
        Insert: Omit<Product, "id" | "created_at" | "updated_at" | "category"> & { id?: string };
        Update: Partial<Omit<Product, "id" | "created_at" | "updated_at" | "category">>;
      };
      shopping_items: {
        Row: ShoppingItem;
        Insert: Omit<ShoppingItem, "id" | "created_at" | "updated_at" | "product"> & { id?: string };
        Update: Partial<Omit<ShoppingItem, "id" | "created_at" | "updated_at" | "product">>;
      };
      purchase_trips: {
        Row: PurchaseTrip;
        Insert: Omit<PurchaseTrip, "id" | "created_at" | "items"> & { id?: string };
        Update: Partial<Omit<PurchaseTrip, "id" | "created_at" | "items">>;
      };
      purchase_trip_items: {
        Row: PurchaseTripItem;
        Insert: Omit<PurchaseTripItem, "id"> & { id?: string };
        Update: Partial<Omit<PurchaseTripItem, "id">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
