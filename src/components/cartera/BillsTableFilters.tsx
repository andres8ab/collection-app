import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ColumnFilterPopoverProps =
  | {
      column: "cliente" | "vendedor" | "ciudad";
      options: { id: string; nombre: string }[];
      value: string[];
      onApply: (ids: string[]) => void;
      onClose: () => void;
      anchorRef: React.RefObject<HTMLElement | null>;
    }
  | {
      column: "saldo";
      value: number | null;
      onApply: (min: number | null) => void;
      onClose: () => void;
      anchorRef: React.RefObject<HTMLElement | null>;
    };

const VIEWPORT_MARGIN = 8;

/**
 * The popover lives inside `.responsive-table-wrap.table-sticky-head`, a box that
 * clips on both axes (overflow-x/y: auto). Anchoring it with `position: absolute`
 * gets it chopped whenever that box is short — e.g. after filtering down to one
 * row. So we portal it to <body> and position it with `fixed`, tracking the
 * anchor's viewport rect.
 */
function useAnchoredPosition(
  anchorRef: React.RefObject<HTMLElement | null>,
  popoverRef: React.RefObject<HTMLElement | null>,
  ready: boolean,
) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!ready) return;
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const update = () => {
      const rect = anchor.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = popover;

      let left = Math.min(
        rect.left,
        window.innerWidth - width - VIEWPORT_MARGIN,
      );
      left = Math.max(left, VIEWPORT_MARGIN);

      let top = rect.bottom + 4;
      if (top + height > window.innerHeight - VIEWPORT_MARGIN) {
        const above = rect.top - height - 4;
        top =
          above >= VIEWPORT_MARGIN
            ? above
            : Math.max(
                VIEWPORT_MARGIN,
                window.innerHeight - height - VIEWPORT_MARGIN,
              );
      }

      setPos((prev) =>
        prev && prev.top === top && prev.left === left ? prev : { top, left },
      );
    };

    update();
    window.addEventListener("resize", update);
    // capture: true so scrolling the table wrapper (not just the page) is seen.
    window.addEventListener("scroll", update, true);
    // The popover resizes as the search box narrows the option list.
    const observer = new ResizeObserver(update);
    observer.observe(popover);

    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [anchorRef, popoverRef, ready]);

  return pos;
}

function AnchoredPopover({
  anchorRef,
  onClose,
  className = "",
  children,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      ) {
        return;
      }
      onClose();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [anchorRef, onClose]);

  const pos = useAnchoredPosition(anchorRef, popoverRef, mounted);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{
        top: pos?.top ?? 0,
        left: pos?.left ?? 0,
        visibility: pos ? undefined : "hidden",
      }}
      className={`fixed z-50 max-w-[calc(100vw-16px)] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-lg ${className}`}
    >
      {children}
    </div>,
    document.body,
  );
}

function SaldoFilterPopover({
  value,
  onApply,
  onClose,
  anchorRef,
}: {
  value: number | null;
  onApply: (min: number | null) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const [pending, setPending] = useState<number | null>(() => value);

  return (
    <AnchoredPopover
      anchorRef={anchorRef}
      onClose={onClose}
      className="min-w-[200px]"
    >
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
        Filtrar por saldo
      </p>
      {value !== null && (
        <button
          type="button"
          onClick={() => {
            onApply(null);
            onClose();
          }}
          className="mb-2 text-xs text-[var(--lagoon)] hover:underline"
        >
          Borrar filtro de Saldo
        </button>
      )}
      <label className="mb-2 flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="saldo"
          checked={pending === null}
          onChange={() => setPending(null)}
          className="rounded border-[var(--line)]"
        />
        <span className="text-sm">Todos</span>
      </label>
      <label className="mb-3 flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="saldo"
          checked={pending !== null && pending !== 0}
          onChange={() =>
            setPending(pending !== null && pending !== 0 ? pending : 1)
          }
          className="rounded border-[var(--line)]"
        />
        <span className="text-sm">Mayor que</span>
        <input
          type="number"
          min={0}
          step={1}
          value={pending !== null && pending !== 0 ? pending : ""}
          onChange={(e) => {
            const v = e.target.value ? parseFloat(e.target.value) : 0;
            setPending(Number.isNaN(v) ? 0 : v);
          }}
          className="w-24 rounded border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-sm"
        />
      </label>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[var(--line)] px-2 py-1 text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(pending);
            onClose();
          }}
          className="rounded bg-[var(--lagoon)] px-2 py-1 text-xs font-medium text-white"
        >
          Aceptar
        </button>
      </div>
    </AnchoredPopover>
  );
}

function MultiSelectFilterPopover({
  column,
  options,
  value,
  onApply,
  onClose,
  anchorRef,
}: {
  column: "cliente" | "vendedor" | "ciudad";
  options: { id: string; nombre: string }[];
  value: string[];
  onApply: (ids: string[]) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const [search, setSearch] = useState("");
  const [pendingIds, setPendingIds] = useState<Set<string>>(
    () => new Set(value),
  );

  const filteredOptions = useMemo(
    () =>
      options.filter((o) =>
        (o.nombre ?? "").toLowerCase().includes(search.toLowerCase().trim()),
      ),
    [options, search],
  );

  const allSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((o) => pendingIds.has(o.id));
  const someSelected = filteredOptions.some((o) => pendingIds.has(o.id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);

  const toggleAll = () => {
    if (allSelected) {
      setPendingIds((prev) => {
        const next = new Set(prev);
        filteredOptions.forEach((o) => next.delete(o.id));
        return next;
      });
    } else {
      setPendingIds((prev) => {
        const next = new Set(prev);
        filteredOptions.forEach((o) => next.add(o.id));
        return next;
      });
    }
  };

  const label =
    column === "vendedor"
      ? "Vendedor"
      : column === "ciudad"
        ? "Ciudad"
        : "Cliente";

  return (
    <AnchoredPopover
      anchorRef={anchorRef}
      onClose={onClose}
      className="max-h-[320px] min-w-[240px]"
    >
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
        Filtrar por {label.toLowerCase()}
      </p>
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => {
            onApply([]);
            onClose();
          }}
          className="mb-2 text-xs text-[var(--lagoon)] hover:underline"
        >
          Borrar filtro de {label}
        </button>
      )}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sea-ink-soft)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full rounded border border-[var(--line)] bg-[var(--surface)] py-1.5 pl-8 pr-2 text-sm"
        />
      </div>
      <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-[var(--line)] pb-2 text-sm">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={toggleAll}
          className="rounded border-[var(--line)]"
          aria-label="Seleccionar todo"
        />
        <span className="text-[var(--sea-ink-soft)]">(Seleccionar todo)</span>
      </label>
      <div className="max-h-48 overflow-y-auto">
        {filteredOptions.map((o) => (
          <label
            key={o.id}
            className="flex cursor-pointer items-center gap-2 py-1 text-sm"
          >
            <input
              type="checkbox"
              checked={pendingIds.has(o.id)}
              onChange={() =>
                setPendingIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(o.id)) next.delete(o.id);
                  else next.add(o.id);
                  return next;
                })
              }
              className="rounded border-[var(--line)]"
            />
            <span className="truncate">{o.nombre ?? "—"}</span>
          </label>
        ))}
      </div>
      <div className="mt-2 flex justify-end gap-2 border-t border-[var(--line)] pt-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-[var(--line)] px-2 py-1 text-xs"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(Array.from(pendingIds));
            onClose();
          }}
          className="rounded bg-[var(--lagoon)] px-2 py-1 text-xs font-medium text-white"
        >
          Aceptar
        </button>
      </div>
    </AnchoredPopover>
  );
}

/**
 * Dispatcher only — it must not call hooks of its own, otherwise switching
 * between the saldo and multi-select variants changes the hook order.
 */
export function ColumnFilterPopover(props: ColumnFilterPopoverProps) {
  if (props.column === "saldo") {
    return (
      <SaldoFilterPopover
        value={props.value}
        onApply={props.onApply}
        onClose={props.onClose}
        anchorRef={props.anchorRef}
      />
    );
  }

  return (
    <MultiSelectFilterPopover
      column={props.column}
      options={props.options}
      value={props.value}
      onApply={props.onApply}
      onClose={props.onClose}
      anchorRef={props.anchorRef}
    />
  );
}
