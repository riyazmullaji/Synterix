"use client";

import { useState } from "react";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SEVERITY_COLORS } from "@/lib/utils";
import type { Rule } from "@/lib/types";

const RULE_TYPES = [
  { value: "unit_map", label: "Unit mapping" },
  { value: "moq_check", label: "MOQ check" },
  { value: "pack_size_check", label: "Pack size check" },
  { value: "required_field", label: "Required field" },
  { value: "duplicate_check", label: "Duplicate check" },
];

export default function RulesPage() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "moq_check", severity: "warning", config: "{}" });

  const { data, error: fetchError, isLoading, mutate } = useSWR("rules", () =>
    api.catalog.listRules()
  );

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      let config: Record<string, unknown> = {};
      try { config = JSON.parse(form.config); } catch { config = {}; }
      await api.catalog.createRule({ name: form.name, type: form.type, severity: form.severity, config });
      await mutate();
      setShowForm(false);
      setForm({ name: "", type: "moq_check", severity: "warning", config: "{}" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    try {
      await api.catalog.toggleRule(id, active);
      await mutate();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Validation Rules</h1>
          <p className="text-sm text-gray-500 mt-1">
            Rules are checked after matching and flag issues for human review.
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>Add Rule</Button>
      </div>

      {(fetchError || error) && <div className="mb-4"><ErrorMessage error={fetchError || error} /></div>}

      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 space-y-4">
          <h2>New Rule</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rule name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                {RULE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
              <select
                value={form.severity}
                onChange={(e) => setForm({ ...form, severity: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                <option value="error">Error (blocks approval)</option>
                <option value="warning">Warning (flags for review)</option>
                <option value="info">Info (informational)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Config (JSON)</label>
              <input
                value={form.config}
                onChange={(e) => setForm({ ...form, config: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm mono focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="{}"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAdd} loading={saving} disabled={!form.name}>Add Rule</Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {isLoading && <PageSpinner label="Loading rules..." />}

      {/* Built-in rules notice */}
      <div className="mb-4 px-4 py-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
        Built-in rules (product_unresolved, low_confidence_match, required_field) always run and cannot be disabled here.
        Custom rules below supplement them.
      </div>

      {data && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Name</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Severity</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Active</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {data.rules.map((r: Rule) => (
                <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!r.is_active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-gray-900">{r.name}</td>
                  <td className="px-4 py-3 text-gray-500 capitalize">{r.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <Badge className={`text-xs ${SEVERITY_COLORS[r.severity] ?? ""}`}>
                      {r.severity}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(r.id, !r.is_active)}
                      className={`w-9 h-5 rounded-full relative transition-colors ${
                        r.is_active ? "bg-gray-900" : "bg-gray-200"
                      }`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        r.is_active ? "translate-x-4" : "translate-x-0.5"
                      }`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs mono text-gray-400">
                      {JSON.stringify(r.config).substring(0, 30)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.rules.length === 0 && (
            <p className="text-center py-10 text-sm text-gray-400">No custom rules defined.</p>
          )}
        </div>
      )}
    </div>
  );
}
