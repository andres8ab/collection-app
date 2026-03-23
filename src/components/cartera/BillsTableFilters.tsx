import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
  const popoverRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorRef, onClose]);

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-lg"
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
    </div>
  );
}

export function ColumnFilterPopover(props: ColumnFilterPopoverProps) {
  const { onClose, anchorRef } = props;
  const popoverRef = useRef<HTMLDivElement>(null);

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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorRef, onClose]);

  if (props.column === "saldo") {
    return (
      <SaldoFilterPopover
        value={props.value}
        onApply={props.onApply}
        onClose={onClose}
        anchorRef={anchorRef}
      />
    );
  }

  const { options, value, onApply } = props;
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

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full z-50 mt-1 max-h-[320px] min-w-[240px] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-lg"
    >
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
        {props.column === "vendedor"
          ? "Filtrar por vendedor"
          : props.column === "ciudad"
            ? "Filtrar por ciudad"
            : "Filtrar por cliente"}
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
          Borrar filtro de{" "}
          {props.column === "vendedor"
            ? "Vendedor"
            : props.column === "ciudad"
              ? "Ciudad"
              : "Cliente"}
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
          <label key={o.id} className="flex cursor-pointer items-center gap-2 py-1 text-sm">
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
    </div>
  );
}
