"use client";

import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageSpinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api";
import { formatSeconds, pct } from "@/lib/utils";
import Link from "next/link";
import { useState } from "react";
import useSWR from "swr";

const PERIODS = [7, 14, 30, 90];

function formatMilliseconds(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  if (value >= 1000) return formatSeconds(value / 1000);
  return `${Math.round(value)} ms`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 shadow-sm shadow-slate-200/50">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-slate-950 tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  );
}

function Badge({ children, tone = "slate" }: { children: string; tone?: "slate" | "green" | "amber" | "rose" | "blue" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-700",
    blue: "bg-sky-100 text-sky-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function MiniBar({ value, max, tone = "bg-slate-900" }: { value: number; max: number; tone?: string }) {
  const width = max > 0 ? Math.max(6, (value / max) * 100) : 6;
  return (
    <div className="h-2 w-full rounded-full bg-slate-100">
      <div className={`h-2 rounded-full ${tone}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export default function QualityPage() {
  const [days, setDays] = useState(30);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR(["quality-stats", days], () =>
    api.quality.getStats(days)
  );
  const {
    data: diagnostics,
    error: diagnosticsError,
    isLoading: diagnosticsLoading,
  } = useSWR(["quality-diagnostics", days], () => api.quality.getDiagnostics(days));

  const error = statsError ?? diagnosticsError;
  const isLoading = statsLoading || diagnosticsLoading;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#f8fafc_55%,#eef2ff_100%)] px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-slate-200/80 bg-slate-950 px-6 py-8 text-white shadow-2xl shadow-slate-300/40 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <Badge tone="blue">Observability</Badge>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Quality Dashboard</h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                  Compact operational view focused on where the pipeline breaks, how matching behaves, and which sessions need attention.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {PERIODS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDays(d)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    days === d
                      ? "bg-white text-slate-950"
                      : "border border-white/15 bg-white/5 text-slate-200 hover:bg-white/10"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <ErrorMessage error={error} title="Failed to load quality diagnostics" />}
        {isLoading && !stats && !diagnostics && <PageSpinner label="Loading observability data..." />}

        {stats && diagnostics && (
          <div className="space-y-8">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Sessions" value={String(stats.total_sessions)} sub={`${stats.period_days}-day window`} />
              <StatCard label="Line Items" value={stats.total_line_items.toLocaleString()} sub="Processed in the period" />
              <StatCard label="First-pass Approval" value={pct(stats.first_pass_approval_rate)} sub="No reviewer edits required" />
              <StatCard label="Correction Rate" value={pct(stats.correction_rate)} sub="Items changed by reviewers" />
              <StatCard label="Unresolved Rate" value={pct(stats.unresolved_rate)} sub="Items still without a confident match" />
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
                <SectionHeader title="Pipeline Breakdown" description="Success/failure and latency by stage" />
                <div className="space-y-4">
                  {diagnostics.pipeline_breakdown.map((stage) => (
                    <div key={stage.stage} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-950 capitalize">{stage.stage}</p>
                          <p className="text-xs text-slate-500">
                            {stage.runs} runs · {stage.successes} successes · {stage.failures} failures
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-500">
                          <p>{formatMilliseconds(stage.avg_latency_ms)}</p>
                          <p>{pct(stage.success_rate)} success rate</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <MiniBar value={stage.success_rate * 100} max={100} tone="bg-slate-950" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
                <SectionHeader title="Matching Diagnostics" description="Retrieval/ranking quality indicators" />
                <div className="grid grid-cols-2 gap-3">
                  <StatCard label="Decisions" value={String(diagnostics.matching_diagnostics.total_decisions)} sub="Logged ranking decisions" />
                  <StatCard label="Top-1 Rate" value={pct(diagnostics.matching_diagnostics.top1_rate)} sub="Selected product was first choice" />
                  <StatCard label="Top-3 Rate" value={pct(diagnostics.matching_diagnostics.top3_rate)} sub="Selected product appeared in candidates" />
                  <StatCard label="Avg Score" value={diagnostics.matching_diagnostics.avg_selected_score?.toFixed(3) ?? "-"} sub="Selected candidate confidence" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Not Retrieved</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{pct(diagnostics.matching_diagnostics.not_retrieved_rate)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Wrong Rank</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-950">{pct(diagnostics.matching_diagnostics.wrong_ranking_rate)}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
              <SectionHeader title="Failure Explorer" description="Recent sessions requiring operator action" />
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Session</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Document</th>
                      <th className="px-4 py-3 text-left font-medium">Failure stage</th>
                      <th className="px-4 py-3 text-right font-medium">Line items</th>
                      <th className="px-4 py-3 text-right font-medium">Unresolved</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.failure_explorer.recent_sessions.map((session) => (
                      <tr key={session.id} className="border-t border-slate-100">
                        <td className="px-4 py-3">
                          <Link href={`/sessions/${session.id}`} className="font-medium text-slate-950 hover:text-slate-600">
                            {session.id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            tone={
                              session.status === "failed" ? "rose" : session.status === "review" ? "amber" : "green"
                            }
                          >
                            {session.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p>{session.document_type ?? "unknown"}</p>
                          <p className="text-xs text-slate-500">
                            {session.file_type ?? "unknown"} · {session.extractor_used ?? "unknown"}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          <p>{session.failure_stage ?? session.error_code ?? session.error_message ?? "-"}</p>
                          <p className="text-xs text-slate-500">{session.strategy_name ?? "default strategy"}</p>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-900">{session.total_line_items}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-slate-900">{session.unresolved_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
                <SectionHeader title="Error Breakdown" description="Correction reasons and stage failure causes" />
                <div className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Correction Reasons</p>
                    <div className="space-y-2">
                      {diagnostics.error_breakdown.correction_reasons.map((item) => (
                        <div key={item.reason} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                          <span className="capitalize text-slate-700">{item.reason.replaceAll("_", " ")}</span>
                          <span className="font-medium tabular-nums text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stage Failure Reasons</p>
                    <div className="space-y-2">
                      {diagnostics.error_breakdown.stage_failure_reasons.map((item) => (
                        <div key={`${item.stage}-${item.error_code}`} className="grid grid-cols-[90px_1fr_48px] items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                          <span className="capitalize text-slate-700">{item.stage}</span>
                          <span className="text-slate-600">{item.error_code}</span>
                          <span className="text-right font-medium tabular-nums text-slate-900">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
                <SectionHeader title="Confidence Calibration" description="Final-state outcomes by confidence bucket" />
                <div className="space-y-2">
                  {diagnostics.confidence_calibration.map((bucket) => (
                    <div key={bucket.bucket} className="grid grid-cols-[90px_60px_1fr] items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-slate-800">{bucket.bucket}</span>
                      <span className="text-slate-500 tabular-nums">{bucket.items}</span>
                      <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                        <span>Appr {pct(bucket.approved_rate)}</span>
                        <span>Corr {pct(bucket.corrected_rate)}</span>
                        <span>Unres {pct(bucket.unresolved_rate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
              <SectionHeader title="Strategy Comparison" description="Secondary comparison by strategy profile" />
              <div className="overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Strategy</th>
                      <th className="px-3 py-2 text-right font-medium">Sessions</th>
                      <th className="px-3 py-2 text-right font-medium">Approved</th>
                      <th className="px-3 py-2 text-right font-medium">Corrected</th>
                      <th className="px-3 py-2 text-right font-medium">Unresolved</th>
                      <th className="px-3 py-2 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diagnostics.strategy_comparison.map((s) => (
                      <tr key={`${s.strategy_name}-${s.retrieval_strategy}-${s.ranking_strategy}`} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-800">
                          <div className="font-medium">{s.strategy_name}</div>
                          <div className="text-xs text-slate-500">{s.retrieval_strategy} · {s.ranking_strategy}</div>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{s.sessions}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(s.approved_rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(s.correction_rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(s.unresolved_rate)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">${s.total_cost.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-200/50">
              <div className="flex items-center justify-between gap-3">
                <SectionHeader title="Advanced: Cost & Efficiency" description="Secondary diagnostics, collapsed by default" />
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {showAdvanced ? "Hide" : "Show"}
                </button>
              </div>
              {showAdvanced && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <StatCard label="Total Cost" value={`$${diagnostics.advanced.cost_efficiency.total_cost.toFixed(4)}`} />
                  <StatCard label="Cost / Session" value={`$${diagnostics.advanced.cost_efficiency.cost_per_session.toFixed(4)}`} />
                  <StatCard label="Model Calls" value={String(diagnostics.advanced.cost_efficiency.model_calls)} />
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
