import { Link } from "@tanstack/react-router";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../lib/auth";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-3 backdrop-blur-lg sm:px-4">
      <nav className="page-wrap flex flex-wrap items-center gap-x-3 gap-y-2 py-3 sm:py-4">
        {/* Logo — left */}
        <h2 className="m-0 min-w-0 flex-shrink-0 text-base font-semibold tracking-tight">
          <Link
            to="/"
            className="inline-flex max-w-full items-center gap-2 rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-[0_8px_24px_rgba(30,90,72,0.08)] sm:px-4 sm:py-2"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[linear-gradient(90deg,#56c6be,#7ed3bf)]" />
            <span className="truncate">Gestión de Cartera</span>
          </Link>
        </h2>

        {/* Nav links — center */}
        <div className="hidden flex-1 items-center justify-center gap-x-4 text-sm font-semibold sm:flex">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Cartera
          </Link>
          <Link
            to="/liquidaciones"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Liquidaciones
          </Link>
          <Link
            to="/reportes"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Reportes
          </Link>
        </div>

        {/* User controls — right */}
        <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
          {user && (
            <div className="hidden text-xs text-[var(--sea-ink-soft)] sm:block">
              <div className="max-w-[120px] truncate font-semibold text-[var(--sea-ink)] lg:max-w-none">
                {user.name ?? user.email}
              </div>
            </div>
          )}
          <ThemeToggle />
          {user && (
            <button
              type="button"
              onClick={signOut}
              className="min-h-[2.25rem] rounded-full border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1 text-xs font-medium text-[var(--sea-ink)] hover:bg-[var(--link-bg-hover)]"
            >
              Cerrar sesión
            </button>
          )}
        </div>

        {/* Mobile nav — full width row below */}
        <div className="order-3 flex w-full flex-wrap items-center justify-start gap-x-4 gap-y-1 pb-1 text-sm font-semibold sm:hidden">
          <Link
            to="/"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Cartera
          </Link>
          <Link
            to="/liquidaciones"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Liquidaciones
          </Link>
          <Link
            to="/reportes"
            className="nav-link"
            activeProps={{ className: "nav-link is-active" }}
          >
            Reportes
          </Link>
        </div>
      </nav>
    </header>
  );
}
