"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { formatRelative, STATUS_LABELS, STATUS_COLORS } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import type { Session } from "@/lib/types";

const STATUS_FILTERS = ["all", "review", "approved", "failed"];

export default function SessionsPage() {
  const [filter, setFilter] = useState("all");
  const [creatingSample, setCreatingSample] = useState(false);
  const { data, error, isLoading, mutate } = useSWR(
    ["sessions", filter],
    () => api.sessions.list(filter === "all" ? undefined : filter),
    { refreshInterval: 5000 }
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const onboarding = searchParams.get("onboarding") === "1";

  const handleCreateSampleSession = async () => {
    setCreatingSample(true);
    try {
      const res = await api.sessions.createSample();
      await mutate();
      router.push(`/sessions/${res.session_id}`);
    } finally {
      setCreatingSample(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {onboarding && (
        <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-medium">You are all set for a quick walkthrough.</p>
          <p className="mt-1 text-emerald-800">
            Click <strong>Create Sample Session</strong> to auto-generate a demo session and open the review screen.
          </p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1>Sessions</h1>
          <p className="text-sm text-gray-500 mt-1">All document processing sessions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleCreateSampleSession} loading={creatingSample}>
            Create Sample Session
          </Button>
          <Link href="/sessions/new">
            <Button>New Session</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-5">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              filter === f
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABELS[f] ?? f}
          </button>
        ))}
        {data && (
          <span className="ml-auto text-xs text-gray-400 self-center">
            {data.total} session{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Error */}
      {error && <ErrorMessage error={error} title="Failed to load sessions" />}

      {/* Loading */}
      {isLoading && !data && <PageSpinner label="Loading sessions..." />}

      {/* Table */}
      {data && data.sessions.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No sessions yet.{" "}
          <Link href="/sessions/new" className="text-gray-700 underline">
            Upload a document
          </Link>{" "}
          to get started, or{" "}
          <button
            className="text-gray-700 underline"
            onClick={() => void handleCreateSampleSession()}
          >
            create a sample session
          </button>
          .
        </div>
      )}

      {data && data.sessions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Session ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Approved</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Unresolved</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.sessions.map((s: Session) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <Badge className={STATUS_COLORS[s.status] ?? "text-gray-600 bg-gray-100"}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 mono text-gray-500">
                    {s.id.substring(0, 8)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.document_type ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.total_line_items}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-green-700">{s.approved_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {s.unresolved_count > 0 ? (
                      <span className="text-red-600">{s.unresolved_count}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatRelative(s.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/sessions/${s.id}`}>
                      <Button variant="ghost" size="sm">Review</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Processing indicator for active sessions */}
      {data?.sessions.some((s: Session) =>
        ["extracting", "structuring", "matching", "validating"].includes(s.status)
      ) && (
        <p className="mt-3 text-xs text-gray-400">
          Some sessions are processing — this page refreshes automatically.
        </p>
      )}
    </div>
  );
}
