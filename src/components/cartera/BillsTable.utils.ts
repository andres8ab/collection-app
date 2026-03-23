import { getBillDescuentoTotal, getBillSaldo, toDecimalValue } from "../../lib/utils";
import type { BillColumn, BillWithRelations } from "./BillsTable.types";

export function getDias(fecha: Date | string): number {
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function getSaldo(bill: BillWithRelations): number {
  return getBillSaldo(bill);
}

export function getDescuentoTotal(bill: BillWithRelations): number {
  return getBillDescuentoTotal(bill);
}

export function computeReteFuenteFromBill(bill: BillWithRelations): number {
  const valor = toDecimalValue(bill.valor);
  const iva = toDecimalValue(bill.iva);
  const raw = (valor - iva) * 0.025;
  const capped = raw > 0 ? raw : 0;
  return Math.round(capped * 100) / 100;
}

export function getAbonoTotal(bill: BillWithRelations): number {
  if (bill.payments && bill.payments.length > 0) {
    return bill.payments.reduce((sum, p) => sum + toDecimalValue(p.amount), 0);
  }
  return toDecimalValue(bill.abono);
}

export function cellValue(
  bill: BillWithRelations,
  col: BillColumn,
): string | number {
  if (col.key === "cliente") return bill.cliente?.nombre ?? "—";
  if (col.key === "ciudad") return bill.ciudad?.nombre ?? "—";
  if (col.key === "vendedor") return bill.vendedor?.nombre ?? "—";
  if (col.key === "fecha") return new Date(bill.fecha).toLocaleDateString("es-CO");
  if (col.key === "dias") return getDias(bill.fecha);
  if (col.key === "saldo") return getSaldo(bill);
  if (col.key === "estado") return bill.estado;
  const val = bill[col.key as keyof BillWithRelations];
  if (val == null) return "—";
  if (typeof val === "object" && "toString" in val) {
    return (val as { toString(): string }).toString();
  }
  return val as string | number;
}
