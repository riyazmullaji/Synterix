"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { Product } from "@/lib/types";

const EMPTY: Partial<Product> = { sku: "", name: "", unit: "", description: "" };

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  const { data, error: fetchError, isLoading, mutate } = useSWR(
    ["products", q],
    () => api.catalog.listProducts(q || undefined),
  );

  const handleSave = async () => {
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      if ((form as Product).id) {
        await api.catalog.updateProduct((form as Product).id, form);
      } else {
        await api.catalog.createProduct(form);
      }
      await mutate();
      setForm(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deactivate this product?")) return;
    try {
      await api.catalog.deleteProduct(id);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  const handleCsvImport = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    setError(null);
    try {
      const res = await api.catalog.importProductsCsv(file);
      await mutate();
      const summary = `CSV import complete: created ${res.created}, updated ${res.updated}, failed ${res.failed}`;
      alert(summary);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Product Catalog</h1>
          <p className="text-sm text-gray-500 mt-1">Manage products matched against incoming documents</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center justify-center rounded border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                void handleCsvImport(file);
                e.currentTarget.value = "";
              }}
            />
            {importing ? "Importing..." : "Import CSV"}
          </label>
          <Button onClick={() => setForm(EMPTY)}>Add Product</Button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        CSV headers: sku,name,description,unit,moq,pack_size
      </p>

      {(fetchError || error) && <div className="mb-4"><ErrorMessage error={fetchError || error} /></div>}

      {/* Search */}
      <div className="mb-5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, SKU, or description..."
          className="w-full max-w-sm border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
        />
      </div>

      {/* Add/Edit form */}
      {form && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
          <h2>{(form as Product).id ? "Edit Product" : "Add Product"}</h2>
          <div className="grid grid-cols-2 gap-4">
            {(["sku", "name", "unit", "description"] as const).map((f) => (
              <div key={f} className={f === "description" ? "col-span-2" : ""}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">{f}</label>
                <input
                  value={(form[f] as string) ?? ""}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            ))}
            {(["moq", "pack_size"] as const).map((f) => (
              <div key={f}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                  {f.replace("_", " ")}
                </label>
                <input
                  type="number"
                  value={(form[f] as number) ?? ""}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} loading={saving}>Save</Button>
            <Button variant="secondary" onClick={() => setForm(null)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading && <PageSpinner label="Loading catalog..." />}

      {data && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
            {data.total} products
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">SKU</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Unit</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 text-xs">MOQ</th>
                <th className="px-4 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {data.products.map((p: Product) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 mono text-gray-700">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.unit ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-500">{p.moq ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setForm(p)}>Edit</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-700">
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.products.length === 0 && (
            <p className="text-center py-10 text-sm text-gray-400">No products found.</p>
          )}
        </div>
      )}
    </div>
  );
}
