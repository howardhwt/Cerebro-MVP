"use client";

import Sidebar from "@/components/Sidebar";
import { Package } from "lucide-react";

export default function ProductVaultPage() {
  return (
    <div className="flex min-h-screen bg-base text-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-y-auto w-full sm:ml-0 bg-grid">
        <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
          <div className="mb-6 sm:mb-8">
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">Product Vault</h1>
            <p className="mt-2 text-sm sm:text-base text-slate-500">
              Manage your product features and capabilities
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800/80 bg-base-100 p-10 sm:p-14 text-center">
            <div className="rounded-full bg-base-200 p-4 mb-4">
              <Package className="h-10 w-10 text-slate-500" />
            </div>
            <p className="font-display text-base font-semibold text-slate-200 mb-2">
              Product Vault coming soon
            </p>
            <p className="text-sm text-slate-500 max-w-sm">
              Track your product capabilities and match them to customer pain points
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
