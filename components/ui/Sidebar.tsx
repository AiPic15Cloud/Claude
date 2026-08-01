"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface NavItem {
  href: string;
  label: string;
  badge?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Aujourd'hui",
    items: [{ href: "/home", label: "Home" }],
  },
  {
    label: "Investissement",
    items: [
      { href: "/pipeline", label: "Pipeline" },
      { href: "/comite", label: "Investment Committee" },
      { href: "/portfolio", label: "Portfolio" },
      { href: "/risque", label: "Risk Office" },
      { href: "/gestion-actifs", label: "Asset Management" },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/recherche", label: "Research" },
      { href: "/connaissance", label: "Knowledge" },
      { href: "/documents", label: "Document AI" },
      { href: "/operateurs", label: "Operator Intelligence" },
      { href: "/marche", label: "Market Intelligence" },
    ],
  },
  {
    label: "Pilotage",
    items: [
      { href: "/investisseurs", label: "Investor Relations" },
      { href: "/taches", label: "Task Engine" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Ferme le tiroir mobile à chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Barre mobile — visible uniquement en dessous du breakpoint lg */}
      <div className="flex items-center justify-between border-b border-line bg-canvas px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-accent" />
          <span className="text-sm font-medium tracking-wide text-ink">ATLAS</span>
        </div>
        <button
          type="button"
          aria-label="Ouvrir le menu"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 flex-col items-center justify-center gap-1.5"
        >
          <span className="h-px w-5 bg-ink" />
          <span className="h-px w-5 bg-ink" />
          <span className="h-px w-5 bg-ink" />
        </button>
      </div>

      {/* Fond assombri derrière le tiroir mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-canvas transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-line px-5 py-5">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-sm font-medium tracking-wide text-ink">ATLAS</span>
            <span className="text-micro text-faint">v1.0</span>
          </div>
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="text-lg text-faint lg:hidden"
          >
            ×
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group) => (
            <div key={group.label} className="mb-6">
              <p className="mb-2 px-2 text-micro font-medium uppercase tracking-wider text-faint">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname?.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`rounded px-2.5 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-raised text-ink"
                          : "text-muted hover:bg-raised/60 hover:text-ink"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line px-5 py-4">
          <p className="text-xs text-muted">Nicolas</p>
          <p className="text-micro text-faint">Estrella Capital</p>
        </div>
      </aside>
    </>
  );
}
