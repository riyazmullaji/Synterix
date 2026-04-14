"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { Synonym } from "@/lib/types";

export default function SynonymsPage() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ term: "", maps_to: "", type: "description" });
  const [showForm, setShowForm] = useState(false);

  const { data, error: fetchError, isLoading, mutate } = useSWR("synonyms", () =>
    api.catalog.listSynonyms()
  );

  const handleAdd = async () => {
    if (!form.term || !form.maps_to) return;
    setSaving(true);
    setError(null);
    try {
      await api.catalog.createSynonym(form);
      await mutate();
      setForm({ term: "", maps_to: "", type: "description" });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.catalog.deleteSynonym(id);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Synonyms</h1>
          <p className="text-sm text-gray-500 mt-1">
            Map customer terminology to your catalog. Used during product matching.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>Add Synonym</Button>
      </div>

      {(fetchError || error) && <div className="mb-4"><ErrorMessage error={fetchError || error} /></div>}

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
          <h2>New Synonym</h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer writes</label>
              <input
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder="e.g. bolt hex"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Maps to</label>
              <input
                value={form.maps_to}
                onChange={(e) => setForm({ ...form, maps_to: e.target.value })}
                placeholder="e.g. hexagon bolt"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="description">Description</option>
                <option value="unit">Unit</option>
                <option value="sku">SKU alias</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} loading={saving} disabled={!form.term || !form.maps_to}>
              Add
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading && <PageSpinner label="Loading synonyms..." />}

      {data && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Customer writes</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Maps to</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Type</th>
                <th className="px-4 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {data.synonyms.map((s: Synonym) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{s.term}</td>
                  <td className="px-4 py-3 text-gray-700">{s.maps_to}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{s.type}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(s.id)}
                    >
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.synonyms.length === 0 && (
            <p className="text-center py-10 text-sm text-gray-400">No synonyms defined yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
