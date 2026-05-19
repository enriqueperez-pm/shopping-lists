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

export interface ShoppingItem {
  id: string;
  product_id: string;
  qty: number;
  price: number;
  checked: boolean;
  weight_grams: number | null;
  created_at: string;
  updated_at: string;
  // joined
  product?: Product;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
