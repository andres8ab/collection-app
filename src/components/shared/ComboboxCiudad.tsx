import { useState, useRef, useEffect } from 'react'

type Ciudad = { id: string; nombre: string }

export function ComboboxCiudad({
  options,
  value,
  onChange,
  onCreate,
  placeholder = 'Buscar o agregar ciudad...',
  disabled,
}: {
  options: Ciudad[]
  value: string
  onChange: (id: string, ciudad: Ciudad) => void
  onCreate: (nombre: string) => Promise<Ciudad>
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find((c) => c.id === value)
  const filtered = filter.trim()
    ? options.filter((c) => c.nombre.toLowerCase().includes(filter.toLowerCase()))
    : options

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleAdd() {
    const nombre = newName.trim()
    if (!nombre) return
    setAdding(true)
    try {
      const created = await onCreate(nombre)
      onChange(created.id, created)
      setNewName('')
      setFilter('')
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
        <div className="absolute top-full left-0 z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-lg">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filtrar..."
            className="w-full border-b border-[var(--line)] bg-transparent px-3 py-2 text-sm outline-none"
            autoFocus
          />
          {filter.trim() && !options.some((c) => c.nombre.toLowerCase() === filter.trim().toLowerCase()) && (
            <div className="border-b border-[var(--line)] p-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={adding ? newName : newName || filter}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nueva ciudad"
                  className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2 py-1.5 text-sm"
                  disabled={adding}
                />
                <button
                  type="button"
                  disabled={adding || !(newName || filter).trim()}
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
                </button>
              </li>
            ))}
            {filtered.length === 0 && !filter && (
              <li className="px-3 py-2 text-sm text-[var(--sea-ink-soft)]">Sin ciudades. Escriba y agregue una.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
