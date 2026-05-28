'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, BarChart2, Map, Flag, Sparkles } from "lucide-react";

const TABS = [
  { href: "/statistiques",            label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/statistiques/graphiques", label: "Graphiques",     icon: BarChart2       },
  { href: "/statistiques/cartes",     label: "Cartes",         icon: Map             },
  { href: "/statistiques/politique",  label: "Politique",      icon: Flag            },
  { href: "/statistiques/fun",        label: "Anecdotes",      icon: Sparkles        },
];

export function StatsNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 flex-wrap">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800",
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
