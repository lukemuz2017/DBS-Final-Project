"use client";

import { useState } from "react";
import { suggestInstitutions } from "@/lib/institutions";
import type { AccountKind } from "@/lib/onboarding";
import { inputCls } from "./fields";

// Bank name with suggestions as you type: up to three matches, plus "Other" for a
// smaller or regional bank (keeps exactly what was typed). Arrow keys + Enter work too.

export function InstitutionInput({ id, value, kind, onChange, placeholder = "Start typing, e.g. Chase" }: {
  id: string;
  value: string;
  kind?: AccountKind;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = value.trim();
  const matches = suggestInstitutions(typed, kind);
  const exact = matches.some((m) => m.name.toLowerCase() === typed.toLowerCase());
  // Options: the matches, then "Other" (keep what's typed) unless it's already an exact match.
  const options: { label: string; value: string; other?: boolean }[] = [
    ...matches.map((m) => ({ label: m.name, value: m.name })),
    ...(typed && !exact ? [{ label: `Other: “${typed}”`, value: typed, other: true }] : []),
  ];
  const show = open && options.length > 0;
  const listId = `${id}-options`;

  const pick = (v: string) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        id={id}
        className={inputCls}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={show ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        // Let a click on an option land before the list closes.
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % options.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a - 1 + options.length) % options.length); }
          else if (e.key === "Enter") { e.preventDefault(); pick(options[active].value); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {show && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
          {options.map((o, i) => (
            <li
              key={o.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? "bg-accent-soft" : ""} ${o.other ? "border-t border-line text-muted" : "font-bold"}`}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
