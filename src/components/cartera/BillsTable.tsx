import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  listBills,
  liquidarFactura,
  updateBill,
  listBillPayments,
  addBillPayment,
  deleteBillPayment,
  listBillDescuentos,
  addBillDescuento,
  deleteBillDescuento,
} from "../../server/cartera";
import { fmtMoney, fmtNum, getMesLabel, toDecimalValue } from "../../lib/utils";
import { Filter, Search } from "lucide-react";
type BillWithRelations = {
  id: string;
  fv: number;
  fecha: Date;
  valor: { toString(): string };
  devo: { toString(): string } | null;
  abono: { toString(): string } | null;
  reteFuente: { toString(): string } | null;
  iva: { toString(): string } | null;
  vSinIva: { toString(): string } | null;
  vComi: { toString(): string } | null;
  descuentos?: {
    id: string;
    amount: { toString(): string } | number;
    concepto: string;
    createdAt: Date;
  }[];
  comentarios: string | null;
  estado: "PENDIENTE" | "LIQUIDADA";
  cliente: { id: string; nombre: string };
  ciudad: { id: string; nombre: string };
  vendedor: { id: string; nombre: string };
  settlement?: { id: string; month: string } | null;
  payments?: { id: string; amount: { toString(): string }; paidAt: Date }[];
  dias?: number;
};

const COLS: {
  key: keyof BillWithRelations | "saldo";
  label: string;
  money?: boolean;
}[] = [
  { key: "cliente", label: "Cliente" },
  { key: "fv", label: "FV" },
  { key: "fecha", label: "Fecha" },
  { key: "dias", label: "Días" },
  { key: "ciudad", label: "Ciudad" },
  { key: "vendedor", label: "Vendedor" },
  { key: "valor", label: "Valor", money: true },
  { key: "devo", label: "Devo.", money: true },
  { key: "abono", label: "Abono", money: true },
  { key: "descuentos", label: "Descuentos", money: true },
  { key: "saldo", label: "Saldo", money: true },
  { key: "reteFuente", label: "Rete Fuente", money: true },
  { key: "iva", label: "IVA", money: true },
  { key: "vSinIva", label: "V. Sin IVA", money: true },
  { key: "vComi", label: "V. Comi.", money: true },
  { key: "estado", label: "Estado" },
];

function getDias(fecha: Date | string): number {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getSaldo(b: BillWithRelations): number {
  const v = toDecimalValue(b.valor);
  const d = toDecimalValue(b.devo);
  const a = toDecimalValue(b.abono);
  const rf = toDecimalValue(b.reteFuente);
  const desc = getDescuentoTotal(b);
  return v - d - a - rf - desc;
}

function getDescuentoTotal(b: BillWithRelations): number {
  if (!b.descuentos || b.descuentos.length === 0) return 0;
  return b.descuentos.reduce((sum, d) => sum + toDecimalValue(d.amount), 0);
}

function computeReteFuenteFromBill(b: BillWithRelations): number {
  const valor = toDecimalValue(b.valor);
  const iva = toDecimalValue(b.iva);
  const base = valor - iva;
  // reteFuente = (valor - iva) * 2.5%
  const raw = base * 0.025;
  const capped = raw > 0 ? raw : 0;
  // DB Decimal(14,2): keep 2 decimals.
  return Math.round(capped * 100) / 100;
}

function getAbonoTotal(b: BillWithRelations): number {
  if (b.payments && b.payments.length > 0) {
    return b.payments.reduce((sum, p) => sum + toDecimalValue(p.amount), 0);
  }
  return toDecimalValue(b.abono);
}

function cellValue(
  b: BillWithRelations,
  col: (typeof COLS)[number],
): string | number {
  if (col.key === "cliente") return b.cliente?.nombre ?? "—";
  if (col.key === "ciudad") return b.ciudad?.nombre ?? "—";
  if (col.key === "vendedor") return b.vendedor?.nombre ?? "—";
  if (col.key === "fecha") return new Date(b.fecha).toLocaleDateString("es-CO");
  if (col.key === "dias") return getDias(b.fecha);
  if (col.key === "saldo") return getSaldo(b);
  if (col.key === "estado") return b.estado;
  const val = b[col.key as keyof BillWithRelations];
  if (val == null) return "—";
  if (typeof val === "object" && "toString" in val)
    return (val as { toString(): string }).toString();
  return val as string | number;
}

const FILTERABLE_COLS = ["vendedor", "ciudad", "saldo"] as const;

type ColumnFilterPopoverProps =
  | {
      column: "vendedor" | "ciudad";
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
      )
        return;
      onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [anchorRef, onClose]);

  const hasActiveFilter = value !== null;

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-lg"
    >
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
        Filtrar por saldo
      </p>
      {hasActiveFilter && (
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
      {/* <label className="mb-2 flex cursor-pointer items-center gap-2">
        <input
          type="radio"
          name="saldo"
          checked={pending === 0}
          onChange={() => setPending(0)}
          className="rounded border-[var(--line)]"
        />
        <span className="text-sm">Mayor que 0</span>
      </label> */}
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

function ColumnFilterPopover(props: ColumnFilterPopoverProps) {
  const { onClose, anchorRef } = props;
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current?.contains(e.target as Node) ||
        anchorRef.current?.contains(e.target as Node)
      )
        return;
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

  const toggleOne = (id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasActiveFilter = value.length > 0;

  return (
    <div
      ref={popoverRef}
      className="absolute left-0 top-full z-50 mt-1 max-h-[320px] min-w-[240px] rounded-lg border border-[var(--line)] bg-[var(--surface-strong)] p-3 shadow-lg"
    >
      <p className="mb-2 text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
        {props.column === "vendedor"
          ? "Filtrar por vendedor"
          : "Filtrar por ciudad"}
      </p>
      {hasActiveFilter && (
        <button
          type="button"
          onClick={() => {
            onApply([]);
            onClose();
          }}
          className="mb-2 text-xs text-[var(--lagoon)] hover:underline"
        >
          Borrar filtro de {props.column === "vendedor" ? "Vendedor" : "Ciudad"}
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
              onChange={() => toggleOne(o.id)}
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

export function BillsTable({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [editDevo, setEditDevo] = useState("");
  const [editComentarios, setEditComentarios] = useState("");
  const [editFecha, setEditFecha] = useState("");
  const [paymentsBillId, setPaymentsBillId] = useState<string | null>(null);
  const [descuentosBillId, setDescuentosBillId] = useState<string | null>(null);

  // Column filters (Excel-style)
  const [filterVendedorIds, setFilterVendedorIds] = useState<string[]>([]);
  const [filterCiudadIds, setFilterCiudadIds] = useState<string[]>([]);
  const [filterSaldoMin, setFilterSaldoMin] = useState<number | null>(null);
  const [openFilter, setOpenFilter] = useState<
    "vendedor" | "ciudad" | "saldo" | null
  >(null);
  const vendedorThRef = useRef<HTMLTableCellElement>(null);
  const ciudadThRef = useRef<HTMLTableCellElement>(null);
  const saldoThRef = useRef<HTMLTableCellElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["bills", userId],
    queryFn: () => listBills({ data: { userId } }),
  });

  const bills = (data ?? []) as BillWithRelations[];

  const uniqueVendedores = useMemo(() => {
    const seen = new Set<string>();
    return bills
      .map((b) => b.vendedor)
      .filter((v) => v?.id && !seen.has(v.id) && (seen.add(v.id), true))
      .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));
  }, [bills]);

  const uniqueCiudades = useMemo(() => {
    const seen = new Set<string>();
    return bills
      .map((b) => b.ciudad)
      .filter((c) => c?.id && !seen.has(c.id) && (seen.add(c.id), true))
      .sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      if (filterVendedorIds.length > 0 && !b.vendedor?.id) return false;
      if (
        filterVendedorIds.length > 0 &&
        !filterVendedorIds.includes(b.vendedor!.id)
      )
        return false;
      if (filterCiudadIds.length > 0 && !b.ciudad?.id) return false;
      if (filterCiudadIds.length > 0 && !filterCiudadIds.includes(b.ciudad!.id))
        return false;
      if (filterSaldoMin != null && getSaldo(b) < filterSaldoMin) return false;
      return true;
    });
  }, [bills, filterVendedorIds, filterCiudadIds, filterSaldoMin]);

  const liquidarMutation = useMutation({
    mutationFn: (billId: string) =>
      liquidarFactura({ data: { userId, billId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    },
  });

  const updateBillMutation = useMutation({
    mutationFn: (data: {
      id: string;
      devo?: number | null;
      abono?: number | null;
      reteFuente?: number | null;
      comentarios?: string | null;
      fecha?: string;
    }) => updateBill({ data: { ...data, userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setEditing(null);
    },
  });

  const startEdit = (b: BillWithRelations) => {
    setEditing(b.id);
    setEditDevo(b.devo != null ? String(toDecimalValue(b.devo)) : "");
    setEditComentarios(b.comentarios ?? "");
    setEditFecha(new Date(b.fecha).toISOString().slice(0, 10));
  };

  const saveEdit = (id: string) => {
    const devo = editDevo.trim()
      ? parseFloat(editDevo.replace(/,/g, ""))
      : null;
    updateBillMutation.mutate({
      id,
      devo: Number.isNaN(devo as number) ? undefined : (devo ?? undefined),
      comentarios: editComentarios.trim() || null,
      fecha: editFecha || undefined,
    });
  };

  if (isLoading)
    return (
      <div className="py-8 text-center text-[var(--sea-ink-soft)]">
        Cargando facturas...
      </div>
    );

  return (
    <div className="responsive-table-wrap rounded-xl border border-[var(--line)]">
      <table className="w-full min-w-[800px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
            {COLS.map((col) => {
              const isFilterable = FILTERABLE_COLS.includes(
                col.key as (typeof FILTERABLE_COLS)[number],
              );
              const hasActiveFilter =
                (col.key === "vendedor" && filterVendedorIds.length > 0) ||
                (col.key === "ciudad" && filterCiudadIds.length > 0) ||
                (col.key === "saldo" && filterSaldoMin != null);
              return (
                <th
                  key={col.key}
                  ref={
                    col.key === "vendedor"
                      ? vendedorThRef
                      : col.key === "ciudad"
                        ? ciudadThRef
                        : col.key === "saldo"
                          ? saldoThRef
                          : undefined
                  }
                  className="relative whitespace-nowrap px-2 py-2 text-left font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)] sm:px-3"
                >
                  <div className="flex items-center gap-1">
                    <span>{col.label}</span>
                    {isFilterable && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenFilter(
                            openFilter === col.key
                              ? null
                              : (col.key as "vendedor" | "ciudad" | "saldo"),
                          )
                        }
                        className={`rounded p-0.5 transition-colors hover:bg-[var(--link-bg-hover)] ${hasActiveFilter ? "text-[var(--lagoon)]" : "text-[var(--sea-ink-soft)]"}`}
                        title={
                          hasActiveFilter
                            ? "Filtro activo (clic para cambiar)"
                            : "Filtrar columna"
                        }
                      >
                        <Filter className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {openFilter === col.key && col.key === "vendedor" && (
                    <ColumnFilterPopover
                      column="vendedor"
                      options={uniqueVendedores}
                      value={filterVendedorIds}
                      onApply={setFilterVendedorIds}
                      onClose={() => setOpenFilter(null)}
                      anchorRef={vendedorThRef}
                    />
                  )}
                  {openFilter === col.key && col.key === "ciudad" && (
                    <ColumnFilterPopover
                      column="ciudad"
                      options={uniqueCiudades}
                      value={filterCiudadIds}
                      onApply={setFilterCiudadIds}
                      onClose={() => setOpenFilter(null)}
                      anchorRef={ciudadThRef}
                    />
                  )}
                  {openFilter === col.key && col.key === "saldo" && (
                    <ColumnFilterPopover
                      column="saldo"
                      value={filterSaldoMin}
                      onApply={setFilterSaldoMin}
                      onClose={() => setOpenFilter(null)}
                      anchorRef={saldoThRef}
                    />
                  )}
                </th>
              );
            })}
            <th className="whitespace-nowrap px-2 py-2 text-center font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)] sm:px-3">
              Acción
            </th>
          </tr>
        </thead>
        <tbody>
          {filteredBills.map((b) => {
            const isEditing = editing === b.id;
            return (
              <tr
                key={b.id}
                className="whitespace-nowrap border-b border-[var(--line)] hover:bg-[var(--link-bg-hover)]"
              >
                {COLS.map((col) => (
                  <td
                    key={col.key}
                    className="px-2 py-2 text-[var(--sea-ink)] sm:px-3"
                  >
                    {col.key === "fecha" && isEditing ? (
                      <input
                        type="date"
                        value={editFecha}
                        onChange={(e) => setEditFecha(e.target.value)}
                        className="w-32 rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.5 text-sm"
                      />
                    ) : col.key === "devo" && isEditing ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editDevo}
                        onChange={(e) => setEditDevo(e.target.value)}
                        className="w-24 rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.5 text-sm"
                      />
                    ) : col.key === "abono" ? (
                      <button
                        type="button"
                        onClick={() => setPaymentsBillId(b.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)] hover:border-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
                      >
                        <span>{fmtMoney(getAbonoTotal(b))}</span>
                        <span className="text-[0.7rem] text-[var(--sea-ink-soft)]">
                          {b.payments && b.payments.length > 0
                            ? `${b.payments.length} pago${b.payments.length !== 1 ? "s" : ""}`
                            : "Agregar"}
                        </span>
                      </button>
                    ) : col.key === "descuentos" ? (
                      <button
                        type="button"
                        onClick={() => setDescuentosBillId(b.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)] hover:border-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
                      >
                        <span>{fmtMoney(getDescuentoTotal(b))}</span>
                        <span className="text-[0.7rem] text-[var(--sea-ink-soft)]">
                          {b.descuentos && b.descuentos.length > 0
                            ? `${b.descuentos.length} descuento${b.descuentos.length !== 1 ? "s" : ""}`
                            : "Agregar"}
                        </span>
                      </button>
                    ) : col.key === "reteFuente" ? (
                      (() => {
                        const rf = toDecimalValue(b.reteFuente);
                        if (rf > 0) {
                          return (
                            <div className="inline-flex items-center gap-2">
                              <span>{fmtMoney(rf)}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateBillMutation.mutate({
                                    id: b.id,
                                    reteFuente: 0,
                                  })
                                }
                                disabled={
                                  updateBillMutation.isPending ||
                                  b.estado !== "PENDIENTE"
                                }
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                title="Quitar reteFuente y volver a 0"
                              >
                                X
                              </button>
                            </div>
                          );
                        }

                        const computed = computeReteFuenteFromBill(b);
                        return (
                          <button
                            type="button"
                            onClick={() =>
                              updateBillMutation.mutate({
                                id: b.id,
                                reteFuente: computed,
                              })
                            }
                            disabled={
                              updateBillMutation.isPending || b.estado !== "PENDIENTE"
                            }
                            className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)] hover:border-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)] disabled:opacity-50"
                            title="Calcular reteFuente y aplicarlo a saldo"
                          >
                            + retefte
                          </button>
                        );
                      })()
                    ) : col.key === "estado" ? (
                      <span
                        className={
                          b.estado === "LIQUIDADA"
                            ? "rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                            : "rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-600"
                        }
                      >
                        {b.estado}
                      </span>
                    ) : col.money ? (
                      fmtMoney(
                        typeof cellValue(b, col) === "number"
                          ? cellValue(b, col)
                          : parseFloat(String(cellValue(b, col))) || 0,
                      )
                    ) : col.key === "dias" ? (
                      fmtNum(cellValue(b, col))
                    ) : (
                      String(cellValue(b, col))
                    )}
                  </td>
                ))}
                <td className="px-2 py-2 sm:px-3">
                  {isEditing ? (
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => saveEdit(b.id)}
                        className="rounded bg-[var(--lagoon)] px-2 py-1 text-xs font-medium text-white hover:opacity-90"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="rounded border border-[var(--line)] px-2 py-1 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : b.estado === "PENDIENTE" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => liquidarMutation.mutate(b.id)}
                        disabled={liquidarMutation.isPending}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Liquidar
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(b)}
                        className="ml-1 rounded border border-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--link-bg-hover)]"
                      >
                        Editar
                      </button>
                    </>
                  ) : b.settlement?.month ? (
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      ✓ {getMesLabel(b.settlement.month)}
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--sea-ink-soft)]">
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {filteredBills.length === 0 && (
        <div className="py-12 text-center text-[var(--sea-ink-soft)]">
          {filterVendedorIds.length > 0 ||
          filterCiudadIds.length > 0 ||
          filterSaldoMin != null
            ? "No hay facturas con los filtros aplicados. Pruebe cambiar o quitar filtros."
            : 'No hay facturas. Use "Nueva factura" para agregar.'}
        </div>
      )}
      {paymentsBillId && (
        <BillPaymentsModal
          bill={bills.find((b) => b.id === paymentsBillId)!}
          onClose={() => setPaymentsBillId(null)}
        />
      )}
      {descuentosBillId && (
        <BillDescuentosModal
          bill={bills.find((b) => b.id === descuentosBillId)!}
          onClose={() => setDescuentosBillId(null)}
        />
      )}
    </div>
  );
}

type BillPaymentsModalProps = {
  bill: BillWithRelations;
  onClose: () => void;
};

function BillPaymentsModal({ bill, onClose }: BillPaymentsModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data } = useQuery({
    queryKey: ["billPayments", bill.id],
    queryFn: () => listBillPayments({ data: { billId: bill.id } }),
  });

  const payments = data?.payments ?? bill.payments ?? [];
  const total = useMemo(
    () =>
      payments.reduce(
        (sum: number, p: { amount: { toString(): string } }) =>
          sum + toDecimalValue(p.amount),
        0,
      ),
    [payments],
  );

  const addMutation = useMutation({
    mutationFn: (payload: { amount: number; paidAt: string }) =>
      addBillPayment({
        data: {
          billId: bill.id,
          amount: payload.amount,
          paidAt: payload.paidAt,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billPayments", bill.id] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setAmount("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: string) =>
      deleteBillPayment({ data: { paymentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billPayments", bill.id] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = amount.trim().replace(/,/g, "");
    const num = parseFloat(value);
    if (!value || Number.isNaN(num) || num <= 0) return;
    if (!date) return;
    addMutation.mutate({ amount: num, paidAt: date });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="island-shell max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] pb-[env(safe-area-inset-bottom)] sm:rounded-2xl sm:pb-0">
        <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="island-kicker mb-1">Abonos</p>
            <h2 className="display-title m-0 truncate text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
              FV {bill.fv} · {bill.cliente?.nombre ?? ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] px-2 py-1 text-xs text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                Monto
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                placeholder="0,00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              Agregar pago
            </button>
          </form>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {payments.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--sea-ink-soft)]">
                No hay pagos registrados para esta factura.
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Eliminar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(
                    (p: {
                      id: string;
                      amount: { toString(): string };
                      paidAt: Date;
                    }) => (
                      <tr key={p.id} className="border-b border-[var(--line)]">
                        <td className="px-3 py-2">
                          {new Date(p.paidAt).toLocaleDateString("es-CO")}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(toDecimalValue(p.amount))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(p.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--line)] font-semibold">
                    <td className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {fmtMoney(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type BillDescuentosModalProps = {
  bill: BillWithRelations;
  onClose: () => void;
};

function BillDescuentosModal({ bill, onClose }: BillDescuentosModalProps) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [concepto, setConcepto] = useState("");

  const { data } = useQuery({
    queryKey: ["billDescuentos", bill.id],
    queryFn: () => listBillDescuentos({ data: { billId: bill.id } }),
  });

  const descuentos = data?.descuentos ?? bill.descuentos ?? [];
  const total = useMemo(
    () =>
      descuentos.reduce(
        (sum: number, d: { amount: { toString(): string } | number }) =>
          sum + toDecimalValue(d.amount),
        0,
      ),
    [descuentos],
  );

  const addMutation = useMutation({
    mutationFn: (payload: { amount: number; concepto: string }) =>
      addBillDescuento({
        data: {
          billId: bill.id,
          amount: payload.amount,
          concepto: payload.concepto,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billDescuentos", bill.id] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setAmount("");
      setConcepto("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (descuentoId: string) =>
      deleteBillDescuento({ data: { descuentoId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["billDescuentos", bill.id] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const value = amount.trim().replace(/,/g, "");
    const num = parseFloat(value);
    const cleanConcepto = concepto.trim();
    if (!value || Number.isNaN(num) || num <= 0) return;
    if (!cleanConcepto) return;
    addMutation.mutate({ amount: num, concepto: cleanConcepto });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4">
      <div className="island-shell max-h-[90vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-[var(--surface-strong)] pb-[env(safe-area-inset-bottom)] sm:rounded-2xl sm:pb-0">
        <div className="flex items-start justify-between gap-2 border-b border-[var(--line)] px-4 py-3 sm:px-5 sm:py-4">
          <div>
            <p className="island-kicker mb-1">Descuentos</p>
            <h2 className="display-title m-0 truncate text-lg font-bold text-[var(--sea-ink)] sm:text-xl">
              FV {bill.fv} · {bill.cliente?.nombre ?? ""}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--line)] px-2 py-1 text-xs text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)]"
          >
            Cerrar
          </button>
        </div>

        <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
          <form
            onSubmit={handleAdd}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                Monto
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                placeholder="0,00"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-[var(--sea-ink-soft)]">
                Concepto
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
                placeholder="Ej: descuento por pronto pago"
              />
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="mt-1 inline-flex items-center justify-center rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              Agregar descuento
            </button>
          </form>

          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--line)] bg-[var(--surface)]">
            {descuentos.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-[var(--sea-ink-soft)]">
                No hay descuentos registrados para esta factura.
              </div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Concepto
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-semibold uppercase text-[var(--sea-ink-soft)]">
                      Eliminar
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {descuentos.map(
                    (d: {
                      id: string;
                      concepto: string;
                      amount: { toString(): string } | number;
                    }) => (
                      <tr key={d.id} className="border-b border-[var(--line)]">
                        <td className="px-3 py-2">
                          <span className="truncate">{d.concepto}</span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          {fmtMoney(toDecimalValue(d.amount))}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => deleteMutation.mutate(d.id)}
                            disabled={deleteMutation.isPending}
                            className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--line)] font-semibold">
                    <td className="px-3 py-2 text-right">Total</td>
                    <td className="px-3 py-2 text-right text-emerald-600">
                      {fmtMoney(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
