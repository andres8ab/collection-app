import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  addBillDescuento,
  addBillPayment,
  deleteBillDescuento,
  deleteBillPayment,
  listBillDescuentos,
  listBillPayments,
} from "../../server/cartera";
import { fmtMoney, toDecimalValue } from "../../lib/utils";
import type { BillWithRelations } from "./BillsTable.types";

type BillPaymentsModalProps = {
  bill: BillWithRelations;
  onClose: () => void;
};

export function BillPaymentsModal({ bill, onClose }: BillPaymentsModalProps) {
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
          userId: bill.userId,
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
            x
          </button>
        </div>
        <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const num = parseFloat(amount.trim().replace(/,/g, ""));
              if (!Number.isNaN(num) && num > 0 && date)
                addMutation.mutate({ amount: num, paidAt: date });
            }}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              placeholder="Monto"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
            />
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
                <tbody>
                  {payments.map(
                    (p: {
                      id: string;
                      paidAt: Date;
                      amount: { toString(): string };
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

export function BillDescuentosModal({
  bill,
  onClose,
}: BillDescuentosModalProps) {
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
          userId: bill.userId,
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
            x
          </button>
        </div>
        <div className="space-y-4 px-4 py-3 sm:px-5 sm:py-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const num = parseFloat(amount.trim().replace(/,/g, ""));
              const cleanConcepto = concepto.trim();
              if (!Number.isNaN(num) && num > 0 && cleanConcepto)
                addMutation.mutate({ amount: num, concepto: cleanConcepto });
            }}
            className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-32 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              placeholder="Monto"
            />
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-sm"
              placeholder="Concepto"
            />
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
                <tbody>
                  {descuentos.map(
                    (d: {
                      id: string;
                      concepto: string;
                      amount: { toString(): string };
                    }) => (
                      <tr key={d.id} className="border-b border-[var(--line)]">
                        <td className="px-3 py-2">{d.concepto}</td>
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
