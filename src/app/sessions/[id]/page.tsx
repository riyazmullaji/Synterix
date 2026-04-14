"use client";

import { LineItemsTable } from "@/components/review/LineItemsTable";
import { TransparencyPanel } from "@/components/review/TransparencyPanel";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageSpinner } from "@/components/ui/Spinner";
import { api, ApiError } from "@/lib/api";
import type { LineItem } from "@/lib/types";
import { formatRelative, STATUS_COLORS, STATUS_LABELS } from "@/lib/utils";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import useSWR from "swr";

export default function ReviewPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const router = useRouter();

  const [selectedItem, setSelectedItem] = useState<LineItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectingProductItemId, setSelectingProductItemId] = useState<string | null>(null);

  // Session metadata
  const { data: session, error: sessionError } = useSWR(
    ["session", sessionId],
    () => api.sessions.get(sessionId),
    { refreshInterval: (data) => (
      data && ["review", "approved", "exported", "failed"].includes(data.status) ? 0 : 3000
    )}
  );

  // Line items
  const { data: itemsData, error: itemsError, mutate: mutateItems } = useSWR(
    session?.status === "review" || session?.status === "approved" ? ["items", sessionId] : null,
    () => api.review.getItems(sessionId),
    { revalidateOnFocus: false }
  );

  const { data: productsData } = useSWR(
    ["catalog-products"],
    () => api.catalog.listProducts(),
    { revalidateOnFocus: false }
  );

  const handleSelectItem = useCallback((item: LineItem) => {
    setSelectedItem(item);
  }, []);

  const handleApproveItem = async (itemId: string) => {
    setActionError(null);
    try {
      await api.review.approveItem(itemId);
      await mutateItems();
      // Keep selected item in sync
      setSelectedItem((prev) => prev?.id === itemId ? { ...prev, status: "approved" } : prev);
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    }
  };

  const handleUpdateField = async (itemId: string, field: "quantity" | "unit", value: string) => {
    setActionError(null);
    try {
      await api.review.updateItem(itemId, {
        [field]: field === "quantity" ? parseFloat(value) : value,
        status: "corrected",
        correction_reason: "field_edit",
      });
      await mutateItems();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    }
  };

  const handleSelectProduct = async (itemId: string, productId: string) => {
    setActionError(null);
    setSelectingProductItemId(itemId);
    try {
      await api.review.updateItem(itemId, {
        selected_product_id: productId,
        status: "corrected",
        correction_reason: "wrong_product",
      });
      const refreshed = await mutateItems();
      if (refreshed?.items) {
        const updated = refreshed.items.find((i) => i.id === itemId);
        if (updated) {
          setSelectedItem((prev) => (prev?.id === itemId ? updated : prev));
        }
      }
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setSelectingProductItemId(null);
    }
  };

  const handleMarkUnresolved = async () => {
    if (!selectedItem) return;
    setActionError(null);
    try {
      await api.review.updateItem(selectedItem.id, { status: "unresolved" });
      await mutateItems();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    }
  };

  const handleApproveSession = async (format: "json" | "csv") => {
    setApproving(true);
    setActionError(null);
    try {
      const result = await api.sessions.approve(sessionId, format);
      if (format === "json") {
        const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `synterix-${sessionId.substring(0, 8)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      router.refresh();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setApproving(false);
    }
  };

  const isProcessing = session && ["extracting", "structuring", "matching", "validating"].includes(session.status);

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 shrink-0">
        <button onClick={() => router.push("/sessions")} className="text-gray-400 hover:text-gray-700 text-sm">
          Sessions
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-500 mono text-sm">{sessionId.substring(0, 8)}</span>

        {session && (
          <Badge className={`ml-2 ${STATUS_COLORS[session.status] ?? "text-gray-500 bg-gray-100"}`}>
            {STATUS_LABELS[session.status] ?? session.status}
          </Badge>
        )}

        {session && (
          <div className="flex gap-4 ml-2 text-xs text-gray-500">
            <span>{session.total_line_items} items</span>
            {session.approved_count > 0 && <span className="text-green-600">{session.approved_count} approved</span>}
            {session.unresolved_count > 0 && <span className="text-red-500">{session.unresolved_count} unresolved</span>}
          </div>
        )}

        <div className="ml-auto flex gap-2">
          {session?.status === "review" && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleApproveSession("csv")}
                loading={exporting}
              >
                Export CSV
              </Button>
              <Button
                size="sm"
                onClick={() => handleApproveSession("json")}
                loading={approving}
              >
                Approve & Export JSON
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Errors */}
      {(sessionError || itemsError || actionError) && (
        <div className="px-6 pt-3">
          <ErrorMessage error={sessionError || itemsError || actionError} />
        </div>
      )}

      {/* Processing state */}
      {isProcessing && (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin mx-auto" />
            <p className="text-sm">Processing — {STATUS_LABELS[session!.status]}</p>
            <p className="text-xs text-gray-400">This page updates automatically</p>
          </div>
        </div>
      )}

      {/* Failed state */}
      {session?.status === "failed" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="font-medium text-red-600">Processing failed</p>
            <p className="text-sm text-gray-500">{session.error_message}</p>
          </div>
        </div>
      )}

      {/* 3-panel review workspace */}
      {(session?.status === "review" || session?.status === "approved") && (
        <>
          {!itemsData && <PageSpinner label="Loading line items..." />}

          {itemsData && (
            <div className="flex flex-1 min-h-0">
              {/* Left: source preview / extracted text placeholder */}
              <div className="w-64 border-r border-gray-200 bg-gray-50 shrink-0 overflow-y-auto p-4 space-y-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Document</p>
                <div className="text-xs text-gray-500 space-y-1.5">
                  <p>Session: <span className="mono text-gray-700">{sessionId.substring(0, 8)}</span></p>
                  <p>Type: <span className="text-gray-700">{session?.document_type ?? "unknown"}</span></p>
                  <p>Items: <span className="text-gray-700">{itemsData.total}</span></p>
                  <p>Created: <span className="text-gray-700">{formatRelative(session?.created_at)}</span></p>
                </div>

                {/* Stage latencies */}
                {session?.stage_latencies && Object.keys(session.stage_latencies).length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Pipeline</p>
                    {Object.entries(session.stage_latencies).map(([stage, ms]) => (
                      <div key={stage} className="flex justify-between text-xs">
                        <span className="text-gray-500 capitalize">{stage}</span>
                        <span className="tabular-nums text-gray-700">{ms}ms</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Item status summary */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Status</p>
                  {(["pending", "approved", "corrected", "unresolved"] as const).map((s) => {
                    const count = itemsData.items.filter((i: LineItem) => i.status === s).length;
                    if (!count) return null;
                    return (
                      <div key={s} className="flex justify-between text-xs">
                        <span className="text-gray-500 capitalize">{s}</span>
                        <span className="tabular-nums text-gray-700">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Center: line items table */}
              <div className="flex-1 min-w-0">
                <LineItemsTable
                  items={itemsData.items}
                  selectedId={selectedItem?.id ?? null}
                  onSelect={handleSelectItem}
                  onApprove={handleApproveItem}
                  onUpdateField={handleUpdateField}
                  onSelectProduct={handleSelectProduct}
                  products={productsData?.products ?? []}
                  selectingProductItemId={selectingProductItemId}
                  loading={approving}
                />
              </div>

              {/* Right: transparency panel */}
              <div className="w-80 border-l border-gray-200 shrink-0">
                <TransparencyPanel
                  item={selectedItem}
                  onSelectProduct={(productId) => selectedItem && handleSelectProduct(selectedItem.id, productId)}
                  onMarkUnresolved={handleMarkUnresolved}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
