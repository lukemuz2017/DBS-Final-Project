"use client";

import { useId, type ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20";

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-bold">{label}</label>
      {children(id)}
      {error ? <p className="text-xs font-bold text-warn">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function MoneyInput({ id, value, onChange, placeholder = "0" }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">$</span>
      <input id={id} inputMode="decimal" className={`${inputCls} pl-6`} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-xl bg-[#f1ece4] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${value === o.value ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-sm">
      <input type="checkbox" className="mt-0.5 size-4 accent-[var(--accent)]" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export function Button({ children, onClick, variant = "primary", type = "button", disabled }: { children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger" | "ghost"; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = {
    primary: "bg-accent text-white hover:bg-accent-strong",
    secondary: "bg-surface text-ink ring-1 ring-line hover:bg-accent-soft",
    danger: "bg-warn-soft text-warn ring-1 ring-warn/30 hover:bg-warn hover:text-white",
    ghost: "text-accent-strong hover:bg-accent-soft",
  }[variant];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${cls}`}>
      {children}
    </button>
  );
}

/** Save / Cancel row, plus an optional two-step Delete (no browser confirm dialog). */
export function FormActions({ onCancel, onDelete, deleteLabel = "Delete", confirming, setConfirming, saveLabel = "Save" }: {
  onCancel: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  confirming?: boolean;
  setConfirming?: (v: boolean) => void;
  saveLabel?: string;
}) {
  return (
    <div className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
      <div>
        {onDelete &&
          (confirming ? (
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold text-warn">Sure?</span>
              <Button variant="danger" onClick={onDelete}>Yes, {deleteLabel.toLowerCase()}</Button>
              <Button variant="ghost" onClick={() => setConfirming?.(false)}>Keep it</Button>
            </span>
          ) : (
            <Button variant="danger" onClick={() => setConfirming?.(true)}>{deleteLabel}</Button>
          ))}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit">{saveLabel}</Button>
      </div>
    </div>
  );
}

export function SmallButton({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-accent-strong hover:bg-accent-soft">
      {children}
    </button>
  );
}

export function PencilIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M8.2 1.8l2 2L4 10H2V8zM7 3l2 2" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></svg>;
}

export function PlusIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>;
}
