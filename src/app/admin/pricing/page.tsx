"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { api, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageSpinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import type { ModelAlias, PricingDiagnostics, PricingRule } from "@/lib/types";

const PROVIDERS = ["google", "openai", "anthropic", "local"];
const UNIT_TYPES: Array<PricingRule["unit_type"]> = ["tokens", "characters", "requests", "minutes", "none"];

function toDateTimeLocal(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIso(value: string) {
  return new Date(value).toISOString();
}

function parseNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusTone(status: PricingRule["status"]) {
  if (status === "active") return "green";
  if (status === "scheduled") return "amber";
  return "rose";
}

function overlapKey(provider: string, modelName: string) {
  return `${provider}::${modelName}`;
}

function findOverlaps<T extends { provider: string; name: string; effective_from: string; effective_to: string | null }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const key = overlapKey(row.provider, row.name);
    const items = grouped.get(key) ?? [];
    items.push(row);
    grouped.set(key, items);
  }

  const overlaps: Array<{ provider: string; name: string; count: number }> = [];
  for (const [key, items] of grouped.entries()) {
    const sorted = [...items].sort((a, b) => new Date(a.effective_from).getTime() - new Date(b.effective_from).getTime());
    let activeEnd = -Infinity;
    let overlapCount = 0;
    for (const row of sorted) {
      const start = new Date(row.effective_from).getTime();
      const end = row.effective_to ? new Date(row.effective_to).getTime() : Infinity;
      if (start < activeEnd) overlapCount += 1;
      activeEnd = Math.max(activeEnd, end);
    }
    if (overlapCount > 0) {
      const [provider, name] = key.split("::");
      overlaps.push({ provider, name, count: overlapCount });
    }
  }
  return overlaps;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-200/40">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-950 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export default function PricingSettingsPage() {
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [savingPricing, setSavingPricing] = useState(false);
  const [savingAlias, setSavingAlias] = useState(false);
  const [ruleForm, setRuleForm] = useState({
    provider: "google",
    billing_model_name: "",
    unit_type: "tokens" as PricingRule["unit_type"],
    input_cost_per_unit: "",
    output_cost_per_unit: "",
    request_cost: "",
    effective_from: toDateTimeLocal(),
    effective_to: "",
    is_temporary: true,
    source_url: "",
    notes: "Temporary placeholder pricing",
  });
  const [aliasForm, setAliasForm] = useState({
    provider: "google",
    logged_model_name: "",
    billing_model_name: "",
    effective_from: toDateTimeLocal(),
    effective_to: "",
  });

  const { data: pricingData, error: pricingFetchError, isLoading: pricingLoading, mutate: mutatePricing } = useSWR(
    "pricing-rules",
    () => api.catalog.listPricingRules(),
    { revalidateOnFocus: false }
  );
  const { data: aliasData, error: aliasFetchError, isLoading: aliasLoading, mutate: mutateAliases } = useSWR(
    "model-aliases",
    () => api.catalog.listModelAliases(),
    { revalidateOnFocus: false }
  );
  const { data: diagnostics, error: diagnosticsError, isLoading: diagnosticsLoading } = useSWR<PricingDiagnostics>(
    "pricing-diagnostics",
    () => api.catalog.getPricingDiagnostics(),
    { revalidateOnFocus: false }
  );

  const error = pricingError || aliasError || pricingFetchError || aliasFetchError || diagnosticsError;
  const isLoading = pricingLoading || aliasLoading || diagnosticsLoading;

  const pricingRules = pricingData?.rules ?? [];
  const aliases = aliasData?.aliases ?? [];
  const pricingOverlaps = useMemo(() => findOverlaps(pricingRules.map((row) => ({
    provider: row.provider,
    name: row.billing_model_name,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
  }))), [pricingRules]);
  const aliasOverlaps = useMemo(() => findOverlaps(aliases.map((row) => ({
    provider: row.provider,
    name: row.logged_model_name,
    effective_from: row.effective_from,
    effective_to: row.effective_to,
  }))), [aliases]);
  const hasOverlapWarnings = pricingOverlaps.length > 0 || aliasOverlaps.length > 0 || (diagnostics?.overlaps?.length ?? 0) > 0;

  const handleSavePricing = async () => {
    setSavingPricing(true);
    setPricingError(null);
    try {
      const created = await api.catalog.createPricingRule({
        provider: ruleForm.provider,
        billing_model_name: ruleForm.billing_model_name.trim(),
        unit_type: ruleForm.unit_type,
        input_cost_per_unit: parseNumber(ruleForm.input_cost_per_unit),
        output_cost_per_unit: parseNumber(ruleForm.output_cost_per_unit),
        request_cost: parseNumber(ruleForm.request_cost),
        effective_from: toIso(ruleForm.effective_from),
        effective_to: ruleForm.effective_to ? toIso(ruleForm.effective_to) : null,
        is_temporary: ruleForm.is_temporary,
        source_url: ruleForm.source_url.trim() || null,
        notes: ruleForm.notes.trim() || null,
      });
      await mutatePricing();
      await mutateAliases();
      setRuleForm({
        provider: ruleForm.provider,
        billing_model_name: "",
        unit_type: ruleForm.unit_type,
        input_cost_per_unit: "",
        output_cost_per_unit: "",
        request_cost: "",
        effective_from: toDateTimeLocal(),
        effective_to: "",
        is_temporary: true,
        source_url: "",
        notes: "Temporary placeholder pricing",
      });
      alert(`Created pricing row v${created.version}${created.overlap_count ? ` with ${created.overlap_count} overlap(s)` : ""}`);
    } catch (err) {
      setPricingError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSavingPricing(false);
    }
  };

  const handleSaveAlias = async () => {
    setSavingAlias(true);
    setAliasError(null);
    try {
      const created = await api.catalog.createModelAlias({
        provider: aliasForm.provider,
        logged_model_name: aliasForm.logged_model_name.trim(),
        billing_model_name: aliasForm.billing_model_name.trim(),
        effective_from: toIso(aliasForm.effective_from),
        effective_to: aliasForm.effective_to ? toIso(aliasForm.effective_to) : null,
      });
      await mutateAliases();
      setAliasForm({
        provider: aliasForm.provider,
        logged_model_name: "",
        billing_model_name: "",
        effective_from: toDateTimeLocal(),
        effective_to: "",
      });
      alert(created.overlap_count ? `Created alias with ${created.overlap_count} overlap(s)` : "Alias created");
    } catch (err) {
      setAliasError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSavingAlias(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_55%,#eef2ff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/40 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge variant="outline" className="border-white/20 bg-white/5 text-white">Settings</Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pricing</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Manage billing model pricing and logged-model aliases in-app. New changes create new historical rows; existing rows remain untouched.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Pricing Rows" value={String(pricingRules.length)} sub="Historical + scheduled" />
              <StatCard label="Aliases" value={String(aliases.length)} sub="Logged -> billing mapping" />
              <StatCard label="Null Cost Rows" value={String(diagnostics?.null_cost_rows ?? 0)} sub="Usage needing pricing" />
            </div>
          </div>
        </div>

        {error && <ErrorMessage error={error} title="Failed to load pricing settings" />}
        {isLoading && !pricingData && !aliasData && !diagnostics && <PageSpinner label="Loading pricing settings..." />}

        {hasOverlapWarnings && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Overlapping effective date ranges were detected. New rows are allowed, but review the schedule before relying on the current active record.
          </div>
        )}

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader
              title="Pricing Rules"
              description="Create a new row to schedule pricing changes. Historical rows are preserved for cost accuracy."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Provider</label>
                <select
                  value={ruleForm.provider}
                  onChange={(e) => setRuleForm({ ...ruleForm, provider: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Billing model name</label>
                <input
                  value={ruleForm.billing_model_name}
                  onChange={(e) => setRuleForm({ ...ruleForm, billing_model_name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="gemini-2.5-flash-lite"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Unit type</label>
                <select
                  value={ruleForm.unit_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, unit_type: e.target.value as PricingRule["unit_type"] })}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {UNIT_TYPES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Effective from</label>
                <input
                  type="datetime-local"
                  value={ruleForm.effective_from}
                  onChange={(e) => setRuleForm({ ...ruleForm, effective_from: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Effective to</label>
                <input
                  type="datetime-local"
                  value={ruleForm.effective_to}
                  onChange={(e) => setRuleForm({ ...ruleForm, effective_to: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="flex items-end gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-2">
                <input
                  id="temporary"
                  type="checkbox"
                  checked={ruleForm.is_temporary}
                  onChange={(e) => setRuleForm({ ...ruleForm, is_temporary: e.target.checked })}
                  className="h-4 w-4"
                />
                <label htmlFor="temporary" className="text-sm text-slate-700">Temporary pricing</label>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Source URL</label>
                <input
                  value={ruleForm.source_url}
                  onChange={(e) => setRuleForm({ ...ruleForm, source_url: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Input cost</label>
                <input
                  type="number"
                  step="0.000001"
                  value={ruleForm.input_cost_per_unit}
                  onChange={(e) => setRuleForm({ ...ruleForm, input_cost_per_unit: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Output cost</label>
                <input
                  type="number"
                  step="0.000001"
                  value={ruleForm.output_cost_per_unit}
                  onChange={(e) => setRuleForm({ ...ruleForm, output_cost_per_unit: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Request cost</label>
                <input
                  type="number"
                  step="0.000001"
                  value={ruleForm.request_cost}
                  onChange={(e) => setRuleForm({ ...ruleForm, request_cost: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
                <textarea
                  value={ruleForm.notes}
                  onChange={(e) => setRuleForm({ ...ruleForm, notes: e.target.value })}
                  rows={3}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSavePricing} loading={savingPricing} disabled={!ruleForm.billing_model_name.trim()}>
                Add Pricing Row
              </Button>
            </div>
            {pricingError && <div className="mt-4"><ErrorMessage error={pricingError} /></div>}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader
              title="Model Aliases"
              description="Map the logged model name to the billing model name used for pricing lookup."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Provider</label>
                <select
                  value={aliasForm.provider}
                  onChange={(e) => setAliasForm({ ...aliasForm, provider: e.target.value })}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Logged model name</label>
                <input
                  value={aliasForm.logged_model_name}
                  onChange={(e) => setAliasForm({ ...aliasForm, logged_model_name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="gemini-2.5-flash-lite"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Billing model name</label>
                <input
                  value={aliasForm.billing_model_name}
                  onChange={(e) => setAliasForm({ ...aliasForm, billing_model_name: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="billing model name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Effective from</label>
                <input
                  type="datetime-local"
                  value={aliasForm.effective_from}
                  onChange={(e) => setAliasForm({ ...aliasForm, effective_from: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Effective to</label>
                <input
                  type="datetime-local"
                  value={aliasForm.effective_to}
                  onChange={(e) => setAliasForm({ ...aliasForm, effective_to: e.target.value })}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={handleSaveAlias} loading={savingAlias} disabled={!aliasForm.logged_model_name.trim() || !aliasForm.billing_model_name.trim()}>
                Add Alias Row
              </Button>
            </div>
            {aliasError && <div className="mt-4"><ErrorMessage error={aliasError} /></div>}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader title="Pricing Rules Table" description="Most recent schedules first. Historical rows remain for cost integrity." />
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Provider</th>
                    <th className="px-3 py-2 text-left font-medium">Billing model</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                    <th className="px-3 py-2 text-right font-medium">Input</th>
                    <th className="px-3 py-2 text-right font-medium">Output</th>
                    <th className="px-3 py-2 text-right font-medium">Request</th>
                    <th className="px-3 py-2 text-left font-medium">Dates</th>
                    <th className="px-3 py-2 text-left font-medium">Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingRules.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-700">{row.provider}</td>
                      <td className="px-3 py-2 text-slate-900">
                        <div className="font-medium">{row.billing_model_name}</div>
                        <div className="text-xs text-slate-500">v{row.version}</div>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{row.unit_type}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{row.input_cost_per_unit ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{row.output_cost_per_unit ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-slate-700">{row.request_cost ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <div className="text-xs">{formatDate(row.effective_from)}</div>
                        <div className="text-xs text-slate-400">to {formatDate(row.effective_to)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className={`border ${row.status === "active" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : row.status === "scheduled" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>
                            {row.status}
                          </Badge>
                          {row.is_temporary && (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">temporary</Badge>
                          )}
                          {row.source_url && (
                            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">source</Badge>
                          )}
                          {((diagnostics?.overlaps?.length ?? 0) > 0 || pricingOverlaps.length > 0) && (
                            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">check overlap</Badge>
                          )}
                        </div>
                        {row.notes && <p className="mt-2 max-w-sm text-xs leading-5 text-slate-500">{row.notes}</p>}
                      </td>
                    </tr>
                  ))}
                  {pricingRules.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-400">No pricing rules defined.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader title="Model Aliases Table" description="Schedule logged-name to billing-name mappings without mutating history." />
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Provider</th>
                    <th className="px-3 py-2 text-left font-medium">Logged model</th>
                    <th className="px-3 py-2 text-left font-medium">Billing model</th>
                    <th className="px-3 py-2 text-left font-medium">Dates</th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 align-top">
                      <td className="px-3 py-2 text-slate-700">{row.provider}</td>
                      <td className="px-3 py-2 text-slate-900">{row.logged_model_name}</td>
                      <td className="px-3 py-2 text-slate-900">{row.billing_model_name}</td>
                      <td className="px-3 py-2 text-slate-600">
                        <div className="text-xs">{formatDate(row.effective_from)}</div>
                        <div className="text-xs text-slate-400">to {formatDate(row.effective_to)}</div>
                        {row.overlap_count ? (
                          <div className="mt-1 text-[11px] font-medium text-amber-700">{row.overlap_count} overlap(s)</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {aliases.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">No aliases defined.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader title="Models Seen in Usage Logs" description="Distinct logged model names and their usage volume." />
            <div className="mt-4 space-y-2">
              {(diagnostics?.models_seen ?? []).map((row) => (
                <div key={`${row.provider}-${row.model_name}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{row.model_name}</p>
                      <p className="text-xs text-slate-500">{row.provider}</p>
                    </div>
                    <div className="text-right text-xs text-slate-600">
                      <p>{row.usage_rows} rows</p>
                      <p>{row.null_cost_rows} null cost</p>
                    </div>
                  </div>
                </div>
              ))}
              {!(diagnostics?.models_seen?.length) && <p className="text-sm text-slate-400">No usage rows yet.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader title="Models Missing Pricing Rules" description="Usage models that still need a pricing row or alias mapping." />
            <div className="mt-4 space-y-2">
              {(diagnostics?.models_missing_pricing ?? []).map((row) => (
                <div key={`${row.provider}-${row.logged_model_name}`} className="rounded-2xl bg-rose-50 px-3 py-2 text-sm">
                  <p className="font-medium text-rose-900">{row.logged_model_name}</p>
                  <p className="text-xs text-rose-700">{row.provider} → {row.billing_model_name} · {row.usage_rows} rows</p>
                </div>
              ))}
              {!(diagnostics?.models_missing_pricing?.length) && <p className="text-sm text-slate-400">All seen models resolve to pricing.</p>}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
            <SectionHeader title="Null Cost Rows" description="Usage rows still lacking `estimated_cost`." />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <StatCard label="Rows" value={String(diagnostics?.null_cost_rows ?? 0)} />
              <StatCard label="Total" value={String(diagnostics?.null_cost_total ?? 0)} sub="Rows with null estimated_cost" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
