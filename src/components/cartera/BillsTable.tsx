import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { liquidarFactura, listBills, updateBill } from "../../server/cartera";
import { toDecimalValue } from "../../lib/utils";
import {
  BillDescuentosModal,
  BillPaymentsModal,
} from "./BillsTableRelatedModals";
import {
  BillsDesktopTable,
  BillMobileDetailModal,
  BillsMobileList,
} from "./BillsTableViews";
import type { BillWithRelations, FilterableCol } from "./BillsTable.types";
import { getSaldo } from "./BillsTable.utils";

export function BillsTable({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editFecha, setEditFecha] = useState("");
  const [editValor, setEditValor] = useState("");
  const [editConditioned, setEditConditioned] = useState(false);
  const [editClienteId, setEditClienteId] = useState("");
  const [editVendedorId, setEditVendedorId] = useState("");
  const [editCiudadId, setEditCiudadId] = useState("");
  const [editFv, setEditFv] = useState("");
  const [paymentsBillId, setPaymentsBillId] = useState<string | null>(null);
  const [descuentosBillId, setDescuentosBillId] = useState<string | null>(null);
  const [filterClienteIds, setFilterClienteIds] = useState<string[]>([]);
  const [filterVendedorIds, setFilterVendedorIds] = useState<string[]>([]);
  const [filterCiudadIds, setFilterCiudadIds] = useState<string[]>([]);
  const [filterSaldoMin, setFilterSaldoMin] = useState<number | null>(null);
  const [openFilter, setOpenFilter] = useState<FilterableCol | null>(null);
  const clienteThRef = useRef<HTMLTableCellElement>(null);
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

  const uniqueClientes = useMemo(() => {
    const seen = new Set<string>();
    return bills
      .map((b) => b.cliente)
      .filter((c) => c?.id && !seen.has(c.id) && (seen.add(c.id), true))
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
      if (filterClienteIds.length > 0 && !b.cliente?.id) return false;
      if (
        filterClienteIds.length > 0 &&
        !filterClienteIds.includes(b.cliente!.id)
      )
        return false;
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
  }, [
    bills,
    filterClienteIds,
    filterVendedorIds,
    filterCiudadIds,
    filterSaldoMin,
  ]);

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
      abono?: number | null;
      reteFuente?: number | null;
      comentarios?: string | null;
      fecha?: string;
      valor?: number;
      conditioned?: boolean;
      clienteId?: string;
      vendedorId?: string;
      ciudadId?: string;
      fv?: number;
    }) => updateBill({ data: { ...data, userId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      setEditing(null);
    },
  });

  const startEdit = (b: BillWithRelations) => {
    setEditing(b.id);
    setEditFecha(new Date(b.fecha).toISOString().slice(0, 10));
    setEditValor(String(toDecimalValue(b.valor)));
    setEditConditioned(Boolean(b.conditioned));
    setEditClienteId(b.cliente.id);
    setEditVendedorId(b.vendedor.id);
    setEditCiudadId(b.ciudad.id);
    setEditFv(String(b.fv));
  };

  const saveEdit = (id: string) => {
    const parsedValor = Number(editValor);
    const parsedFv = Number(editFv);
    updateBillMutation.mutate({
      id,
      fecha: editFecha || undefined,
      valor: Number.isFinite(parsedValor) ? parsedValor : undefined,
      conditioned: editConditioned,
      clienteId: editClienteId || undefined,
      vendedorId: editVendedorId || undefined,
      ciudadId: editCiudadId || undefined,
      fv: Number.isFinite(parsedFv) && parsedFv > 0 ? parsedFv : undefined,
    });
  };

  if (isLoading)
    return (
      <div className="py-8 text-center text-[var(--sea-ink-soft)]">
        Cargando facturas...
      </div>
    );

  const selectedBill = selectedBillId
    ? (bills.find((b) => b.id === selectedBillId) ?? null)
    : null;

  return (
    <div>
      <BillsDesktopTable
        bills={filteredBills}
        allBills={bills}
        editing={editing}
        editFecha={editFecha}
        editValor={editValor}
        editConditioned={editConditioned}
        setEditFecha={setEditFecha}
        setEditValor={setEditValor}
        setEditConditioned={setEditConditioned}
        editClienteId={editClienteId}
        editVendedorId={editVendedorId}
        editCiudadId={editCiudadId}
        editFv={editFv}
        setEditClienteId={setEditClienteId}
        setEditVendedorId={setEditVendedorId}
        setEditCiudadId={setEditCiudadId}
        setEditFv={setEditFv}
        startEdit={startEdit}
        cancelEdit={() => setEditing(null)}
        saveEdit={saveEdit}
        liquidar={(id) => liquidarMutation.mutate(id)}
        isLiquidating={liquidarMutation.isPending}
        updateReteFuente={(id, value) =>
          updateBillMutation.mutate({ id, reteFuente: value })
        }
        isUpdatingBill={updateBillMutation.isPending}
        openPayments={setPaymentsBillId}
        openDescuentos={setDescuentosBillId}
        filterClienteIds={filterClienteIds}
        filterVendedorIds={filterVendedorIds}
        filterCiudadIds={filterCiudadIds}
        filterSaldoMin={filterSaldoMin}
        setFilterClienteIds={setFilterClienteIds}
        setFilterVendedorIds={setFilterVendedorIds}
        setFilterCiudadIds={setFilterCiudadIds}
        setFilterSaldoMin={setFilterSaldoMin}
        openFilter={openFilter}
        setOpenFilter={setOpenFilter}
        uniqueClientes={uniqueClientes}
        uniqueVendedores={uniqueVendedores}
        uniqueCiudades={uniqueCiudades}
        clienteThRef={clienteThRef}
        vendedorThRef={vendedorThRef}
        ciudadThRef={ciudadThRef}
        saldoThRef={saldoThRef}
      />
      <BillsMobileList
        bills={filteredBills}
        allBills={bills}
        editing={editing}
        editFecha={editFecha}
        editValor={editValor}
        editConditioned={editConditioned}
        setEditFecha={setEditFecha}
        setEditValor={setEditValor}
        setEditConditioned={setEditConditioned}
        editClienteId={editClienteId}
        editVendedorId={editVendedorId}
        editCiudadId={editCiudadId}
        editFv={editFv}
        setEditClienteId={setEditClienteId}
        setEditVendedorId={setEditVendedorId}
        setEditCiudadId={setEditCiudadId}
        setEditFv={setEditFv}
        startEdit={startEdit}
        cancelEdit={() => setEditing(null)}
        saveEdit={saveEdit}
        liquidar={(id) => liquidarMutation.mutate(id)}
        isLiquidating={liquidarMutation.isPending}
        updateReteFuente={(id, value) =>
          updateBillMutation.mutate({ id, reteFuente: value })
        }
        isUpdatingBill={updateBillMutation.isPending}
        openPayments={setPaymentsBillId}
        openDescuentos={setDescuentosBillId}
        filterClienteIds={filterClienteIds}
        filterVendedorIds={filterVendedorIds}
        filterCiudadIds={filterCiudadIds}
        filterSaldoMin={filterSaldoMin}
        setFilterClienteIds={setFilterClienteIds}
        setFilterVendedorIds={setFilterVendedorIds}
        setFilterCiudadIds={setFilterCiudadIds}
        setFilterSaldoMin={setFilterSaldoMin}
        uniqueClientes={uniqueClientes}
        uniqueVendedores={uniqueVendedores}
        uniqueCiudades={uniqueCiudades}
        onSelectBill={(bill) => setSelectedBillId(bill.id)}
      />
      {selectedBill && (
        <BillMobileDetailModal
          bill={selectedBill}
          onClose={() => setSelectedBillId(null)}
          bills={filteredBills}
          allBills={bills}
          editing={editing}
          editFecha={editFecha}
          editValor={editValor}
          editConditioned={editConditioned}
          setEditFecha={setEditFecha}
          setEditValor={setEditValor}
          setEditConditioned={setEditConditioned}
          editClienteId={editClienteId}
          editVendedorId={editVendedorId}
          editCiudadId={editCiudadId}
          editFv={editFv}
          setEditClienteId={setEditClienteId}
          setEditVendedorId={setEditVendedorId}
          setEditCiudadId={setEditCiudadId}
          setEditFv={setEditFv}
          startEdit={startEdit}
          cancelEdit={() => setEditing(null)}
          saveEdit={saveEdit}
          liquidar={(id) => liquidarMutation.mutate(id)}
          isLiquidating={liquidarMutation.isPending}
          updateReteFuente={(id, value) =>
            updateBillMutation.mutate({ id, reteFuente: value })
          }
          isUpdatingBill={updateBillMutation.isPending}
          openPayments={setPaymentsBillId}
          openDescuentos={setDescuentosBillId}
          uniqueClientes={uniqueClientes}
          uniqueVendedores={uniqueVendedores}
          uniqueCiudades={uniqueCiudades}
        />
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
