"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type CellInputType = "text" | "number" | "date" | "select";

type SelectOption = { value: string; label: string };

type Props = {
  display: ReactNode;
  editable?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCommit: (value: string) => void;
  onCancel: () => void;
  inputType?: CellInputType;
  editValue?: string;
  options?: SelectOption[];
  className?: string;
  align?: "left" | "right";
};

export default function MovementTableCell({
  display,
  editable = true,
  isEditing,
  onStartEdit,
  onCommit,
  onCancel,
  inputType = "text",
  editValue = "",
  options = [],
  className = "",
  align = "left",
}: Props) {
  const [draft, setDraft] = useState(editValue);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(editValue);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isEditing, editValue]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit(draft);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const alignClass = align === "right" ? "text-right" : "text-left";

  if (isEditing) {
    if (inputType === "select") {
      return (
        <td className={`px-2 py-1.5 align-middle ${alignClass} ${className}`}>
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              onCommit(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => onCommit(draft)}
            className="w-full min-w-[7rem] text-xs border border-[var(--flujo-mint)] rounded px-1.5 py-1 bg-white"
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </td>
      );
    }

    return (
      <td className={`px-2 py-1.5 align-middle ${alignClass} ${className}`}>
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={inputType}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => onCommit(draft)}
          className={`w-full min-w-[5rem] text-xs border border-[var(--flujo-mint)] rounded px-1.5 py-1 bg-white ${
            inputType === "number" ? "tabular-nums" : ""
          }`}
        />
      </td>
    );
  }

  return (
    <td
      className={`px-2 py-2 align-middle text-xs text-ink ${alignClass} ${
        editable ? "cursor-pointer hover:bg-[rgb(var(--ink-rgb)/0.03)]" : ""
      } ${className}`}
      onClick={editable ? onStartEdit : undefined}
      title={editable ? "Click para editar" : undefined}
    >
      {display}
    </td>
  );
}
