import { ReactNode } from "react";
import Link from "next/link";

type AppShellProps = {
  children: ReactNode;
};

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/orders", label: "Orders" },
  { href: "/invoices", label: "Invoices" },
  { href: "/purchasing", label: "Purchasing" },
  { href: "/vendors", label: "Vendors" },
  { href: "/reports", label: "Reports" },
];

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Food background image */}
     {/* Soft food-service background */}
{/* Soft food-service background */}
<div className="fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,_#fff7ed,_transparent_35%),radial-gradient(circle_at_top_right,_#dbeafe,_transparent_35%),linear-gradient(135deg,_#f8fafc,_#ffffff)]" />

{/* Soft overlay for readability */}
<div className="fixed inset-0 -z-10 bg-white/35" />

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/dashboard" className="text-2xl font-bold text-blue-700">
            iBirdOS
          </Link>

          <nav className="flex items-center gap-6 text-sm font-medium text-slate-600">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 transition hover:bg-blue-50 hover:text-blue-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}