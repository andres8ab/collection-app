import { AlertTriangle, Filter } from "lucide-react";
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
  filterVendedorIds: string[];
  filterCiudadIds: string[];
  filterSaldoMin: number | null;
  setFilterVendedorIds: (v: string[]) => void;
  setFilterCiudadIds: (v: string[]) => void;
  setFilterSaldoMin: (v: number | null) => void;
  openFilter: FilterableCol | null;
  setOpenFilter: (value: FilterableCol | null) => void;
  uniqueVendedores: { id: string; nombre: string }[];
  uniqueCiudades: { id: string; nombre: string }[];
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
                const isFilterable = ["vendedor", "ciudad", "saldo"].includes(
                  col.key,
                );
                const hasActiveFilter =
                  (col.key === "vendedor" &&
                    props.filterVendedorIds.length > 0) ||
                  (col.key === "ciudad" && props.filterCiudadIds.length > 0) ||
                  (col.key === "saldo" && props.filterSaldoMin != null);
                return (
                  <th
                    key={col.key}
                    ref={
                      col.key === "vendedor"
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
  props: SharedProps & {
    onSelectBill: (bill: BillWithRelations) => void;
  },
) {
  return (
    <div className="space-y-2 md:hidden">
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

export function BillMobileDetailModal({
  bill,
  onClose,
  ...props
}: SharedProps & { bill: BillWithRelations; onClose: () => void }) {
  const isEditing = props.editing === bill.id;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-4 md:hidden">
      <div className="island-shell max-h-[92vh] w-full overflow-auto rounded-t-2xl bg-[var(--surface-strong)] p-4 sm:max-w-lg sm:rounded-2xl">
        <div className="mb-3 flex items-start justify-between">
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
        <div className="space-y-2">
          {COLS.map((col) => (
            <div
              key={col.key}
              className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
            >
              <p className="text-[11px] uppercase text-[var(--sea-ink-soft)]">
                {col.label}
              </p>
              <div className="mt-1 text-sm">
                {renderCell(col.key, bill, isEditing, props)}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">{renderActions(bill, isEditing, props)}</div>
      </div>
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
