"use client";

import { useMemo } from "react";
import {
  getCanonicalCategories,
  getCanonicalSubcategories,
} from "../taxonomy-canonical";

type Props = {
  type: "income" | "expense";
  category: string;
  subcategory: string;
  onCategoryChange: (category: string) => void;
  onSubcategoryChange: (subcategory: string) => void;
  disabled?: boolean;
};

export default function CategorySubcategoryPicker({
  type,
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
  disabled,
}: Props) {
  const categories = useMemo(() => getCanonicalCategories(type), [type]);
  const subcategories = useMemo(
    () => (category ? getCanonicalSubcategories(type, category) : []),
    [type, category],
  );

  return (
    <>
      <label className="block space-y-1">
        <span className="modal-label">Categoría</span>
        <select
          value={category}
          onChange={(e) => {
            onCategoryChange(e.target.value);
            onSubcategoryChange("");
          }}
          disabled={disabled}
          className="modal-input bg-white"
        >
          <option value="">Selecciona categoría</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="modal-label">Subcategoría</span>
        <select
          value={subcategory}
          onChange={(e) => onSubcategoryChange(e.target.value)}
          disabled={disabled || !category}
          className="modal-input bg-white"
        >
          <option value="">Selecciona subcategoría</option>
          {subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
