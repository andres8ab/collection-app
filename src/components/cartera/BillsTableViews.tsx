import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Filter,
  MapPin,
  UserRound,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { fmtMoney, fmtNum, getMesLabel, toDecimalValue } from "../../lib/utils";
import { ColumnFilterPopover } from "./BillsTableFilters";
import { COLS } from "./BillsTable.types";
import type { BillWithRelations, FilterableCol } from "./BillsTable.types";
import {
  cellValue,
  computeReteFuenteFromBill,
  getAbonoTotal,
  getDescuentoTotal,
} from "./BillsTable.utils";

type SharedProps = {
  bills: BillWithRelations[];
  allBills: BillWithRelations[];
  editing: string | null;
  editFecha: string;
  editValor: string;
  setEditFecha: (v: string) => void;
  setEditValor: (v: string) => void;
  startEdit: (bill: BillWithRelations) => void;
  cancelEdit: () => void;
  saveEdit: (id: string) => void;
  liquidar: (id: string) => void;
  isLiquidating: boolean;
  updateReteFuente: (id: string, value: number) => void;
  isUpdatingBill: boolean;
  openPayments: (id: string) => void;
  openDescuentos: (id: string) => void;
};

type DesktopProps = SharedProps & {
  filterClienteIds: string[];
  filterVendedorIds: string[];
  filterCiudadIds: string[];
  filterSaldoMin: number | null;
  setFilterClienteIds: (v: string[]) => void;
  setFilterVendedorIds: (v: string[]) => void;
  setFilterCiudadIds: (v: string[]) => void;
  setFilterSaldoMin: (v: number | null) => void;
  openFilter: FilterableCol | null;
  setOpenFilter: (value: FilterableCol | null) => void;
  uniqueClientes: { id: string; nombre: string }[];
  uniqueVendedores: { id: string; nombre: string }[];
  uniqueCiudades: { id: string; nombre: string }[];
  clienteThRef: React.RefObject<HTMLTableCellElement | null>;
  vendedorThRef: React.RefObject<HTMLTableCellElement | null>;
  ciudadThRef: React.RefObject<HTMLTableCellElement | null>;
  saldoThRef: React.RefObject<HTMLTableCellElement | null>;
};

export function BillsDesktopTable(props: DesktopProps) {
  return (
    <div className="hidden rounded-xl border border-[var(--line)] md:block">
      <div className="responsive-table-wrap">
        <table className="w-full min-w-[800px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--header-bg)]">
              {COLS.map((col) => {
                const isFilterable = [
                  "cliente",
                  "vendedor",
                  "ciudad",
                  "saldo",
                ].includes(col.key);
                const hasActiveFilter =
                  (col.key === "cliente" &&
                    props.filterClienteIds.length > 0) ||
                  (col.key === "vendedor" &&
                    props.filterVendedorIds.length > 0) ||
                  (col.key === "ciudad" && props.filterCiudadIds.length > 0) ||
                  (col.key === "saldo" && props.filterSaldoMin != null);
                return (
                  <th
                    key={col.key}
                    ref={
                      col.key === "cliente"
                        ? props.clienteThRef
                        : col.key === "vendedor"
                          ? props.vendedorThRef
                          : col.key === "ciudad"
                            ? props.ciudadThRef
                            : col.key === "saldo"
                              ? props.saldoThRef
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
                            props.setOpenFilter(
                              props.openFilter === col.key
                                ? null
                                : (col.key as FilterableCol),
                            )
                          }
                          className={`rounded p-0.5 transition-colors hover:bg-[var(--link-bg-hover)] ${hasActiveFilter ? "text-[var(--lagoon)]" : "text-[var(--sea-ink-soft)]"}`}
                        >
                          <Filter className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {props.openFilter === col.key && col.key === "vendedor" && (
                      <ColumnFilterPopover
                        column="vendedor"
                        options={props.uniqueVendedores}
                        value={props.filterVendedorIds}
                        onApply={props.setFilterVendedorIds}
                        onClose={() => props.setOpenFilter(null)}
                        anchorRef={props.vendedorThRef}
                      />
                    )}
                    {props.openFilter === col.key && col.key === "cliente" && (
                      <ColumnFilterPopover
                        column="cliente"
                        options={props.uniqueClientes}
                        value={props.filterClienteIds}
                        onApply={props.setFilterClienteIds}
                        onClose={() => props.setOpenFilter(null)}
                        anchorRef={props.clienteThRef}
                      />
                    )}
                    {props.openFilter === col.key && col.key === "ciudad" && (
                      <ColumnFilterPopover
                        column="ciudad"
                        options={props.uniqueCiudades}
                        value={props.filterCiudadIds}
                        onApply={props.setFilterCiudadIds}
                        onClose={() => props.setOpenFilter(null)}
                        anchorRef={props.ciudadThRef}
                      />
                    )}
                    {props.openFilter === col.key && col.key === "saldo" && (
                      <ColumnFilterPopover
                        column="saldo"
                        value={props.filterSaldoMin}
                        onApply={props.setFilterSaldoMin}
                        onClose={() => props.setOpenFilter(null)}
                        anchorRef={props.saldoThRef}
                      />
                    )}
                  </th>
                );
              })}
              <th className="whitespace-nowrap px-2 py-2 text-center font-semibold uppercase tracking-wide text-[var(--sea-ink-soft)] sm:px-3">
                Accion
              </th>
            </tr>
          </thead>
          <tbody>
            {props.bills.map((bill) => (
              <DesktopRow key={bill.id} bill={bill} {...props} />
            ))}
          </tbody>
        </table>
      </div>
      {props.bills.length === 0 && <EmptyBills />}
    </div>
  );
}

function DesktopRow({
  bill,
  ...props
}: SharedProps & { bill: BillWithRelations }) {
  const isEditing = props.editing === bill.id;
  return (
    <tr className="whitespace-nowrap border-b border-[var(--line)] hover:bg-[var(--link-bg-hover)]">
      {COLS.map((col) => (
        <td key={col.key} className="px-2 py-2 text-[var(--sea-ink)] sm:px-3">
          {renderCell(col.key, bill, isEditing, props)}
        </td>
      ))}
      <td className="px-2 py-2 sm:px-3">
        {renderActions(bill, isEditing, props)}
      </td>
    </tr>
  );
}

export function BillsMobileList(
  props: SharedProps &
    Pick<
      DesktopProps,
      | "filterClienteIds"
      | "filterVendedorIds"
      | "filterCiudadIds"
      | "filterSaldoMin"
      | "setFilterClienteIds"
      | "setFilterVendedorIds"
      | "setFilterCiudadIds"
      | "setFilterSaldoMin"
      | "uniqueClientes"
      | "uniqueVendedores"
      | "uniqueCiudades"
    > & {
      onSelectBill: (bill: BillWithRelations) => void;
    },
) {
  const [openFilter, setOpenFilter] = useState<FilterableCol | null>(null);
  const [pendingClienteIds, setPendingClienteIds] = useState<string[]>(
    props.filterClienteIds,
  );
  const [pendingVendedorIds, setPendingVendedorIds] = useState<string[]>(
    props.filterVendedorIds,
  );
  const [pendingCiudadIds, setPendingCiudadIds] = useState<string[]>(
    props.filterCiudadIds,
  );
  const [pendingSaldoMin, setPendingSaldoMin] = useState<number | null>(
    props.filterSaldoMin,
  );

  const openMobileFilter = (filter: FilterableCol) => {
    setPendingClienteIds(props.filterClienteIds);
    setPendingVendedorIds(props.filterVendedorIds);
    setPendingCiudadIds(props.filterCiudadIds);
    setPendingSaldoMin(props.filterSaldoMin);
    setOpenFilter(filter);
  };

  return (
    <div className="space-y-2 md:hidden">
      <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => openMobileFilter("cliente")}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            props.filterClienteIds.length > 0
              ? "border-[var(--lagoon)] text-[var(--lagoon)]"
              : "border-[var(--line)] text-[var(--sea-ink-soft)]"
          }`}
        >
          <Filter className="h-3 w-3" />
          Cliente
        </button>
        <button
          type="button"
          onClick={() => openMobileFilter("vendedor")}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            props.filterVendedorIds.length > 0
              ? "border-[var(--lagoon)] text-[var(--lagoon)]"
              : "border-[var(--line)] text-[var(--sea-ink-soft)]"
          }`}
        >
          <Filter className="h-3 w-3" />
          Vend.
        </button>
        <button
          type="button"
          onClick={() => openMobileFilter("ciudad")}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            props.filterCiudadIds.length > 0
              ? "border-[var(--lagoon)] text-[var(--lagoon)]"
              : "border-[var(--line)] text-[var(--sea-ink-soft)]"
          }`}
        >
          <Filter className="h-3 w-3" />
          Ciudad
        </button>
        <button
          type="button"
          onClick={() => openMobileFilter("saldo")}
          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
            props.filterSaldoMin != null
              ? "border-[var(--lagoon)] text-[var(--lagoon)]"
              : "border-[var(--line)] text-[var(--sea-ink-soft)]"
          }`}
        >
          <Filter className="h-3 w-3" />
          Saldo
        </button>
      </div>
      {openFilter && (
        <MobileFilterDrawer
          openFilter={openFilter}
          pendingClienteIds={pendingClienteIds}
          pendingVendedorIds={pendingVendedorIds}
          pendingCiudadIds={pendingCiudadIds}
          pendingSaldoMin={pendingSaldoMin}
          uniqueClientes={props.uniqueClientes}
          uniqueVendedores={props.uniqueVendedores}
          uniqueCiudades={props.uniqueCiudades}
          onClose={() => setOpenFilter(null)}
          onPendingClienteChange={setPendingClienteIds}
          onPendingVendedorChange={setPendingVendedorIds}
          onPendingCiudadChange={setPendingCiudadIds}
          onPendingSaldoChange={setPendingSaldoMin}
          onApply={() => {
            props.setFilterClienteIds(pendingClienteIds);
            props.setFilterVendedorIds(pendingVendedorIds);
            props.setFilterCiudadIds(pendingCiudadIds);
            props.setFilterSaldoMin(pendingSaldoMin);
            setOpenFilter(null);
          }}
        />
      )}
      {props.bills.map((bill) => (
        <button
          key={bill.id}
          type="button"
          onClick={() => props.onSelectBill(bill)}
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] p-3 text-left"
        >
          <div className="flex items-center justify-between">
            <p className="truncate text-sm font-semibold text-[var(--sea-ink)]">
              {bill.cliente?.nombre ?? "—"}
            </p>
            <span className="rounded-full bg-[var(--chip-bg)] px-2 py-0.5 text-xs text-[var(--sea-ink-soft)]">
              FV {bill.fv}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-[var(--sea-ink-soft)]">
              {new Date(bill.fecha).toLocaleDateString("es-CO")}
            </span>
            <strong className="text-[var(--sea-ink)]">
              {fmtMoney(toDecimalValue(cellValue(bill, COLS[9])))}
            </strong>
          </div>
        </button>
      ))}
      {props.bills.length === 0 && <EmptyBills />}
    </div>
  );
}

function MobileFilterDrawer({
  openFilter,
  pendingClienteIds,
  pendingVendedorIds,
  pendingCiudadIds,
  pendingSaldoMin,
  uniqueClientes,
  uniqueVendedores,
  uniqueCiudades,
  onPendingClienteChange,
  onPendingVendedorChange,
  onPendingCiudadChange,
  onPendingSaldoChange,
  onClose,
  onApply,
}: {
  openFilter: FilterableCol;
  pendingClienteIds: string[];
  pendingVendedorIds: string[];
  pendingCiudadIds: string[];
  pendingSaldoMin: number | null;
  uniqueClientes: { id: string; nombre: string }[];
  uniqueVendedores: { id: string; nombre: string }[];
  uniqueCiudades: { id: string; nombre: string }[];
  onPendingClienteChange: (ids: string[]) => void;
  onPendingVendedorChange: (ids: string[]) => void;
  onPendingCiudadChange: (ids: string[]) => void;
  onPendingSaldoChange: (value: number | null) => void;
  onClose: () => void;
  onApply: () => void;
}) {
  const title =
    openFilter === "cliente"
      ? "Filtrar por cliente"
      : openFilter === "vendedor"
        ? "Filtrar por vendedor"
        : openFilter === "ciudad"
          ? "Filtrar por ciudad"
          : "Filtrar por saldo";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden"
      onClick={onClose}
    >
      <div
        className="island-shell w-full rounded-t-2xl bg-[var(--surface-strong)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-[var(--sea-ink)]">
            {title}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--line)] px-2 py-1 text-xs"
          >
            Cerrar
          </button>
        </div>

        {openFilter === "saldo" ? (
          <div className="space-y-2">
            <label className="block text-xs text-[var(--sea-ink-soft)]">
              Saldo minimo
            </label>
            <input
              type="number"
              min={0}
              step={1}
              value={pendingSaldoMin ?? ""}
              onChange={(e) =>
                onPendingSaldoChange(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className="w-full rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => onPendingSaldoChange(null)}
              className="text-xs text-[var(--lagoon)] hover:underline"
            >
              Quitar filtro saldo
            </button>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {(openFilter === "cliente"
              ? uniqueClientes
              : openFilter === "vendedor"
                ? uniqueVendedores
                : uniqueCiudades
            ).map((item) => {
              const selectedIds =
                openFilter === "cliente"
                  ? pendingClienteIds
                  : openFilter === "vendedor"
                    ? pendingVendedorIds
                    : pendingCiudadIds;
              const setSelected =
                openFilter === "cliente"
                  ? onPendingClienteChange
                  : openFilter === "vendedor"
                    ? onPendingVendedorChange
                    : onPendingCiudadChange;
              const checked = selectedIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className="flex items-center gap-2 rounded border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() =>
                      setSelected(
                        checked
                          ? selectedIds.filter((id) => id !== item.id)
                          : [...selectedIds, item.id],
                      )
                    }
                  />
                  <span>{item.nombre ?? "—"}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-[var(--line)] px-3 py-1.5 text-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onApply}
            className="rounded bg-[var(--lagoon)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

export function BillMobileDetailModal({
  bill,
  onClose,
  ...props
}: SharedProps & { bill: BillWithRelations; onClose: () => void }) {
  const isEditing = props.editing === bill.id;
  return (
    <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4 md:hidden">
      <div className="island-shell max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-[var(--surface-strong)] p-0 sm:max-w-lg sm:rounded-2xl">
        <div className="sticky top-0 z-10 border-b border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 backdrop-blur">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--sea-ink-soft)]">
                Detalle factura
              </p>
              <h3 className="text-base font-bold text-[var(--sea-ink)]">
                FV {bill.fv} - {bill.cliente?.nombre ?? "—"}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-[var(--line)] px-2 py-1 text-xs"
            >
              Cerrar
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                bill.estado === "LIQUIDADA"
                  ? "rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-600"
                  : "rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-600"
              }
            >
              {bill.estado}
            </span>
            {Boolean(bill.conditioned) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <AlertTriangle className="h-3 w-3" />
                Condicionada
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2 p-4 pb-24">
          <InfoCard
            label="Cliente"
            icon={<UserRound className="h-4 w-4 text-[var(--sea-ink-soft)]" />}
          >
            {bill.cliente?.nombre ?? "—"}
          </InfoCard>
          <InfoCard
            label="Fecha"
            icon={
              <CalendarClock className="h-4 w-4 text-[var(--sea-ink-soft)]" />
            }
          >
            {new Date(bill.fecha).toLocaleDateString("es-CO")}
          </InfoCard>
          <InfoCard
            label="Ciudad"
            icon={<MapPin className="h-4 w-4 text-[var(--sea-ink-soft)]" />}
          >
            {bill.ciudad?.nombre ?? "—"}
          </InfoCard>
          <InfoCard
            label="Vendedor"
            icon={<Building2 className="h-4 w-4 text-[var(--sea-ink-soft)]" />}
          >
            {bill.vendedor?.nombre ?? "—"}
          </InfoCard>
          <InfoCard
            label="Saldo"
            icon={<Wallet className="h-4 w-4 text-[var(--sea-ink-soft)]" />}
          >
            <span className="text-base font-bold text-[var(--sea-ink)]">
              {fmtMoney(toDecimalValue(cellValue(bill, COLS[9])))}
            </span>
          </InfoCard>
          {COLS.filter(
            (c) =>
              ![
                "cliente",
                "fecha",
                "ciudad",
                "vendedor",
                "saldo",
                "estado",
              ].includes(String(c.key)),
          ).map((col) => (
            <div
              key={col.key}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
            >
              <p className="inline-flex items-center gap-1 text-[11px] uppercase text-[var(--sea-ink-soft)]">
                <CircleDollarSign className="h-3.5 w-3.5" />
                {col.label}
              </p>
              <div className="mt-1 text-sm">
                {renderCell(col.key, bill, isEditing, props)}
              </div>
            </div>
          ))}
        </div>
        <div className="sticky bottom-0 z-10 border-t border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 backdrop-blur">
          {renderActions(bill, isEditing, props)}
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2">
      <p className="inline-flex items-center gap-1 text-[11px] uppercase text-[var(--sea-ink-soft)]">
        {icon}
        {label}
      </p>
      <div className="mt-1 text-sm text-[var(--sea-ink)]">{children}</div>
    </div>
  );
}

function renderCell(
  key: string,
  bill: BillWithRelations,
  isEditing: boolean,
  props: SharedProps,
) {
  const col = COLS.find((c) => c.key === key)!;
  if (key === "fecha" && isEditing) {
    return (
      <input
        type="date"
        value={props.editFecha}
        onChange={(e) => props.setEditFecha(e.target.value)}
        className="w-32 rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.5 text-sm"
      />
    );
  }
  if (key === "valor" && isEditing) {
    return (
      <input
        type="number"
        min={0}
        step="0.01"
        value={props.editValor}
        onChange={(e) => props.setEditValor(e.target.value)}
        className="w-32 rounded border border-[var(--line)] bg-[var(--surface)] px-1 py-0.5 text-sm"
      />
    );
  }
  if (key === "abono") {
    return (
      <button
        type="button"
        onClick={() => props.openPayments(bill.id)}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)]"
      >
        {fmtMoney(getAbonoTotal(bill))}
      </button>
    );
  }
  if (key === "descuentos") {
    return (
      <button
        type="button"
        onClick={() => props.openDescuentos(bill.id)}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)]"
      >
        {fmtMoney(getDescuentoTotal(bill))}
      </button>
    );
  }
  if (key === "reteFuente") {
    const rf = toDecimalValue(bill.reteFuente);
    if (rf > 0) {
      return (
        <div className="inline-flex items-center gap-2">
          <span>{fmtMoney(rf)}</span>
          <button
            type="button"
            onClick={() => props.updateReteFuente(bill.id, 0)}
            disabled={props.isUpdatingBill || bill.estado !== "PENDIENTE"}
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-red-300 bg-red-50 text-red-600 disabled:opacity-50"
          >
            X
          </button>
        </div>
      );
    }
    return (
      <button
        type="button"
        onClick={() =>
          props.updateReteFuente(bill.id, computeReteFuenteFromBill(bill))
        }
        disabled={props.isUpdatingBill || bill.estado !== "PENDIENTE"}
        className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--sea-ink)] disabled:opacity-50"
      >
        + retefte
      </button>
    );
  }
  if (key === "estado") {
    return (
      <div className="inline-flex items-center gap-1">
        <span
          className={
            bill.estado === "LIQUIDADA"
              ? "rounded-full bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-600"
              : "rounded-full bg-blue-900/30 px-2 py-0.5 text-xs font-semibold text-blue-600"
          }
        >
          {bill.estado}
        </span>
        {Boolean(bill.conditioned) && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            Cond.
          </span>
        )}
      </div>
    );
  }
  if (col.money) {
    const value = cellValue(bill, col);
    return fmtMoney(
      typeof value === "number" ? value : parseFloat(String(value)) || 0,
    );
  }
  if (key === "dias") return fmtNum(cellValue(bill, col));
  return String(cellValue(bill, col));
}

function renderActions(
  bill: BillWithRelations,
  isEditing: boolean,
  props: SharedProps,
) {
  if (isEditing) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          onClick={() => props.saveEdit(bill.id)}
          className="rounded bg-[var(--lagoon)] px-2 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={props.cancelEdit}
          className="rounded border border-[var(--line)] px-2 py-1 text-xs"
        >
          Cancelar
        </button>
      </div>
    );
  }
  if (bill.estado === "PENDIENTE") {
    return (
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => props.liquidar(bill.id)}
          disabled={props.isLiquidating}
          className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Liquidar
        </button>
        <button
          type="button"
          onClick={() => props.startEdit(bill)}
          className="rounded border border-[var(--line)] px-2 py-1 text-xs hover:bg-[var(--link-bg-hover)]"
        >
          Editar
        </button>
      </div>
    );
  }
  return (
    <span className="text-xs text-[var(--sea-ink-soft)]">
      {bill.settlement?.month ? `✓ ${getMesLabel(bill.settlement.month)}` : "—"}
    </span>
  );
}

function EmptyBills() {
  return (
    <div className="py-12 text-center text-[var(--sea-ink-soft)]">
      No hay facturas para esta vista.
    </div>
  );
}
