"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import {
  BarChart3,
  Package,
  Radar,
  Menu,
  X,
  Bell,
  LayoutDashboard,
  Building2,
} from "lucide-react";

const menuItems = [
  {
    name: "Meetings",
    href: "/",
    icon: BarChart3,
  },
  {
    name: "Companies",
    href: "/pain-points",
    icon: Building2,
  },
  {
    name: "Alerts",
    href: "/alerts",
    icon: Bell,
  },
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Product Vault",
    href: "/product-vault",
    icon: Package,
  },
  {
    name: "Radar",
    href: "/radar",
    icon: Radar,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="sm:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-base-100 border border-slate-800 text-white"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 z-40 bg-base/90 backdrop-blur-md"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed sm:static h-screen w-64 flex-col border-r border-slate-800/50 bg-base-50 z-40 transform transition-transform duration-200 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      } sm:translate-x-0 sm:flex`}>
        <div className="flex h-16 items-center border-b border-slate-800/50 px-4 sm:px-6">
          <Image
            src="/cerebro-logo.png"
            alt="Cerebro"
            width={24}
            height={24}
            className="h-6 w-6"
            priority
          />
          <span className="ml-2 font-display text-xl font-semibold tracking-tight text-white">Cerebro</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                    ? "bg-accent/15 text-accent-light border border-accent/20 shadow-glow-sm"
                    : "text-slate-400 hover:bg-base-200 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </>
  );
}
