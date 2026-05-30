"use client";

import { useEffect, useRef, useState } from "react";

const TAP_SLOP = 10;

type EditFieldProps = {
  value: string | number;
  onCommit: (value: string | number) => void;
  type?: "text" | "number";
  format?: (v: number) => string;
  parse?: (s: string) => number | null;
  className?: string;
  displayClassName?: string;
  inputClassName?: string;
  ariaLabel: string;
  prefix?: string;
};

export default function EditField({
  value,
  onCommit,
  type = "text",
  format,
  parse,
  className = "",
  displayClassName = "",
  inputClassName = "",
  ariaLabel,
  prefix,
}: EditFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  const beginEdit = () => {
    if (type === "number" && typeof value === "number") {
      setDraft(Number.isInteger(value) ? String(value) : String(value));
    } else {
      setDraft(String(value));
    }
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
  };

  const commit = () => {
    setEditing(false);
    if (type === "number") {
      const parsed = parse ? parse(draft) : Number(draft);
      if (parsed === null || Number.isNaN(parsed)) return;
      if (typeof value === "number" && parsed !== value) onCommit(parsed);
    } else {
      const next = draft.trim();
      if (next && next !== value) onCommit(next);
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start) return;
    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);
    if (dx <= TAP_SLOP && dy <= TAP_SLOP) beginEdit();
  };

  if (editing) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${className}`} data-no-swipe>
        {prefix && <span className="text-ink-faint text-sm shrink-0">{prefix}</span>}
        <input
          ref={inputRef}
          type="text"
          inputMode={type === "number" ? "decimal" : "text"}
          enterKeyHint="done"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className={`edit-field ${inputClassName}`}
          aria-label={ariaLabel}
        />
      </span>
    );
  }

  const display =
    type === "number" && typeof value === "number"
      ? format
        ? format(value)
        : String(value)
      : String(value);

  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { pointerStart.current = null; }}
      className={`edit-display ${displayClassName}`}
      aria-label={`${ariaLabel}: ${display}, editar`}
    >
      {prefix && <span className="text-ink-faint mr-0.5">{prefix}</span>}
      {display}
    </button>
  );
}
