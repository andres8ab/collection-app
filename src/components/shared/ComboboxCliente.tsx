import { useState, useRef, useEffect } from 'react'
import { ComboboxCiudad } from './ComboboxCiudad'
import type { Ciudad } from './ComboboxCiudad'

type Cliente = { id: string; nombre: string; nit: string | null; direccion: string | null; ciudad: Ciudad }

export function ComboboxCliente({
  options,
  ciudades,
  value,
  onChange,
  onCreate,
  onCreateCiudad,
  placeholder = 'Buscar o agregar cliente...',
  disabled,
}: {
  options: Cliente[]
  ciudades: Ciudad[]
  value: string
  onChange: (id: string, c: Cliente) => void
  onCreate: (data: { nombre: string; nit?: string; direccion?: string; ciudadId: string }) => Promise<Cliente>
  onCreateCiudad: (nombre: string) => Promise<Ciudad>
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addNombre, setAddNombre] = useState('')
  const [addNit, setAddNit] = useState('')
  const [addDireccion, setAddDireccion] = useState('')
  const [addCiudadId, setAddCiudadId] = useState('')
  const [adding, setAdding] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((c) => c.id === value)
  const filtered = filter.trim()
    ? options.filter(
        (c) =>
          c.nombre.toLowerCase().includes(filter.toLowerCase()) ||
          (c.nit ?? '').toLowerCase().includes(filter.toLowerCase())
      )
    : options

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setShowAdd(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleAdd() {
    const nombre = addNombre.trim()
    if (!nombre || !addCiudadId) return
    setAdding(true)
    try {
      const created = await onCreate({
        nombre,
        nit: addNit.trim() || undefined,
        direccion: addDireccion.trim() || undefined,
        ciudadId: addCiudadId,
      })
      onChange(created.id, created)
      setAddNombre('')
      setAddNit('')
      setAddDireccion('')
      setAddCiudadId('')
      setShowAdd(false)
      setOpen(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-left text-sm text-[var(--sea-ink)] transition hover:border-[var(--lagoon-deep)] focus:outline-none focus:ring-2 focus:ring-[var(--lagoon)] disabled:opacity-60"
      >
        {selected ? selected.nombre : placeholder}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full min-w-[280px] overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-lg">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar por nombre o NIT..."
            className="w-full border-b border-[var(--line)] bg-transparent px-3 py-2 text-sm outline-none"
            autoFocus
          />
          {!showAdd ? (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full border-b border-[var(--line)] px-3 py-2 text-left text-sm font-medium text-[var(--lagoon-deep)] hover:bg-[var(--link-bg-hover)]"
            >
              + Agregar nuevo cliente
            </button>
          ) : (
            <div className="space-y-2 border-b border-[var(--line)] p-3">
              <input
                type="text"
                value={addNombre}
                onChange={(e) => setAddNombre(e.target.value)}
                placeholder="Nombre *"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              />
              <input
                type="text"
                value={addNit}
                onChange={(e) => setAddNit(e.target.value)}
                placeholder="NIT"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              />
              <input
                type="text"
                value={addDireccion}
                onChange={(e) => setAddDireccion(e.target.value)}
                placeholder="Dirección"
                className="w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm"
              />
              <ComboboxCiudad
                options={ciudades}
                value={addCiudadId}
                onChange={(id) => setAddCiudadId(id)}
                onCreate={onCreateCiudad}
                placeholder="Ciudad *"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="rounded-lg border border-[var(--line)] px-3 py-1.5 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={adding || !addNombre.trim() || !addCiudadId}
                  onClick={handleAdd}
                  className="rounded-lg bg-[var(--lagoon)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {adding ? '...' : 'Agregar'}
                </button>
              </div>
            </div>
          )}
          <ul className="max-h-40 overflow-auto py-1">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.id, c)
                    setOpen(false)
                    setFilter('')
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-[var(--link-bg-hover)]"
                >
                  {c.nombre}
                  {c.ciudad?.nombre && (
                    <span className="ml-1 text-[var(--sea-ink-soft)]">({c.ciudad.nombre})</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
