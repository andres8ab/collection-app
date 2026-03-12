import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listCiudades,
  listClientes,
  listVendedores,
  createBill,
  createCiudad,
  createCliente,
  createVendedor,
} from '../../server/cartera'
import { ComboboxCiudad } from '../shared/ComboboxCiudad'
import { ComboboxCliente } from '../shared/ComboboxCliente'
import { ComboboxVendedor } from '../shared/ComboboxVendedor'

export function AddBillForm({ onSuccess }: { onSuccess?: () => void }) {
  const queryClient = useQueryClient()
  const [clienteId, setClienteId] = useState('')
  const [ciudadId, setCiudadId] = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [fv, setFv] = useState('')
  const [valor, setValor] = useState('')
  const [open, setOpen] = useState(false)

  const { data: ciudades = [] } = useQuery({
    queryKey: ['ciudades'],
    queryFn: () => listCiudades({ data: undefined }),
  })
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes'],
    queryFn: () => listClientes({ data: undefined }),
  })
  const { data: vendedores = [] } = useQuery({
    queryKey: ['vendedores'],
    queryFn: () => listVendedores({ data: undefined }),
  })

  const createBillMutation = useMutation({
    mutationFn: (data: {
      clienteId: string
      fv: number
      ciudadId: string
      vendedorId: string
      valor: number
    }) => createBill({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] })
      setClienteId('')
      setCiudadId('')
      setVendedorId('')
      setFv('')
      setValor('')
      setOpen(false)
      onSuccess?.()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const fvNum = parseInt(fv, 10)
    const valorNum = parseFloat(valor.replace(/,/g, ''))
    if (!clienteId || !ciudadId || !vendedorId || !fv || Number.isNaN(fvNum) || Number.isNaN(valorNum) || valorNum <= 0) {
      return
    }
    createBillMutation.mutate({
      clienteId,
      fv: fvNum,
      ciudadId,
      vendedorId,
      valor: valorNum,
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl border border-[var(--lagoon)] bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
      >
        + Nueva factura
      </button>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="island-shell space-y-4 rounded-2xl p-6"
    >
      <h3 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">Nueva factura</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">Cliente *</label>
          <ComboboxCliente
            options={clientes}
            ciudades={ciudades}
            value={clienteId}
            onChange={(id) => setClienteId(id)}
            onCreate={async (data) => {
              const c = await createCliente({ data })
              queryClient.invalidateQueries({ queryKey: ['clientes'] })
              return c
            }}
            onCreateCiudad={async (nombre) => {
              const ci = await createCiudad({ data: { nombre } })
              queryClient.invalidateQueries({ queryKey: ['ciudades'] })
              return ci
            }}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">FV (Nº factura) *</label>
          <input
            type="number"
            value={fv}
            onChange={(e) => setFv(e.target.value)}
            min={1}
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">Ciudad *</label>
          <ComboboxCiudad
            options={ciudades}
            value={ciudadId}
            onChange={(id) => setCiudadId(id)}
            onCreate={(nombre) => createCiudad({ data: { nombre } })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">Vendedor *</label>
          <ComboboxVendedor
            options={vendedores}
            value={vendedorId}
            onChange={(id) => setVendedorId(id)}
            onCreate={(nombre) => createVendedor({ data: { nombre } })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--sea-ink-soft)]">Valor (COP) *</label>
          <input
            type="text"
            inputMode="numeric"
            value={valor}
            onChange={(e) => setValor(e.target.value.replace(/[^\d,]/g, ''))}
            placeholder="0"
            className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-xl border border-[var(--line)] px-4 py-2 text-sm font-medium"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={
            createBillMutation.isPending ||
            !clienteId ||
            !ciudadId ||
            !vendedorId ||
            !fv ||
            !valor
          }
          className="rounded-xl bg-[var(--lagoon)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {createBillMutation.isPending ? 'Guardando...' : 'Agregar factura'}
        </button>
      </div>
      {createBillMutation.isError && (
        <p className="text-sm text-red-600">
          {createBillMutation.error instanceof Error
            ? createBillMutation.error.message
            : 'Error al guardar'}
        </p>
      )}
    </form>
  )
}
