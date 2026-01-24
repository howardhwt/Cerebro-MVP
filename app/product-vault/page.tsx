"use client";

import Sidebar from "@/components/Sidebar";
import { Package } from "lucide-react";

export default function ProductVaultPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Product Vault</h1>
            <p className="mt-2 text-gray-600">
              Manage your product features and capabilities
            </p>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white p-12 text-center">
            <Package className="h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm font-medium text-gray-700">
              Product Vault coming soon
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
