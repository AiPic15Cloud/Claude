"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-line bg-canvas">
      <div className="flex items-center gap-2 border-b border-line px-5 py-5">
        <div className="h-2 w-2 rounded-full bg-accent" />
        <span className="text-sm font-medium tracking-wide text-ink">ATLAS</span>
        <span className="text-micro text-faint">v1.0</span>
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
  );
}
