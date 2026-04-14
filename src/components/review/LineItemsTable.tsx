"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CONFIDENCE_COLORS } from "@/lib/utils";
import type { LineItem, Product } from "@/lib/types";

interface LineItemsTableProps {
  items: LineItem[];
  selectedId: string | null;
  onSelect: (item: LineItem) => void;
  onApprove: (itemId: string) => void;
  onUpdateField: (itemId: string, field: "quantity" | "unit", value: string) => void;
  onSelectProduct: (itemId: string, productId: string) => void;
  products: Product[];
  selectingProductItemId?: string | null;
  loading?: boolean;
}

export function LineItemsTable({
  items, selectedId, onSelect, onApprove, onUpdateField, onSelectProduct, products, selectingProductItemId, loading,
}: LineItemsTableProps) {
  const [editing, setEditing] = useState<{ id: string; field: "quantity" | "unit" } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [matchEditorItemId, setMatchEditorItemId] = useState<string | null>(null);
  const [matchQuery, setMatchQuery] = useState("");

  const startEdit = (item: LineItem, field: "quantity" | "unit", e: React.MouseEvent) => {
    e.stopPropagation();
    setEditing({ id: item.id, field });
    setEditValue(String(field === "quantity" ? item.quantity ?? "" : item.unit ?? ""));
  };

  const commitEdit = () => {
    if (!editing) return;
    onUpdateField(editing.id, editing.field, editValue);
    setEditing(null);
  };

  const filteredProducts = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
      .slice(0, 12);
  };

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-white z-10 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs w-8">#</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Description</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs w-24">Qty</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs w-20">Unit</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs">Match</th>
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 text-xs w-28">Confidence</th>
            <th className="px-4 py-2.5 w-28"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isSelected = item.id === selectedId;
            const selected = item.candidates.find((c) => c.is_selected);
            const hasError = item.validation_issues.some((v) => v.severity === "error");
            const hasWarning = item.validation_issues.some((v) => v.severity === "warning");

            return (
              <tr
                key={item.id}
                onClick={() => onSelect(item)}
                className={`border-b border-gray-100 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-blue-50 border-blue-100"
                    : "hover:bg-gray-50"
                }`}
              >
                <td className="px-4 py-3 text-gray-400 text-xs tabular-nums">{item.line_number}</td>

                {/* Description */}
                <td className="px-4 py-3">
                  <p className="text-gray-900 leading-snug line-clamp-2">
                    {item.normalized_description || item.raw_description}
                  </p>
                  {item.raw_sku && (
                    <p className="text-xs text-gray-400 mono mt-0.5">{item.raw_sku}</p>
                  )}
                  {hasError && (
                    <span className="text-xs text-red-600 mt-0.5 block">
                      {item.validation_issues.find((v) => v.severity === "error")?.message}
                    </span>
                  )}
                </td>

                {/* Quantity */}
                <td className="px-4 py-3">
                  {editing?.id === item.id && editing.field === "quantity" ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-20 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <button
                      onClick={(e) => startEdit(item, "quantity", e)}
                      className="text-gray-700 hover:underline tabular-nums text-left w-full"
                    >
                      {item.quantity ?? item.raw_quantity ?? "—"}
                    </button>
                  )}
                </td>

                {/* Unit */}
                <td className="px-4 py-3">
                  {editing?.id === item.id && editing.field === "unit" ? (
                    <input
                      autoFocus
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditing(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-16 border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                    />
                  ) : (
                    <button
                      onClick={(e) => startEdit(item, "unit", e)}
                      className="text-gray-700 hover:underline text-left w-full"
                    >
                      {item.unit ?? item.raw_unit ?? "—"}
                    </button>
                  )}
                </td>

                {/* Match */}
                <td className="px-4 py-3">
                  {selected ? (
                    <div>
                      <p className="text-gray-900 line-clamp-1">{selected.product?.name}</p>
                      <p className="text-xs text-gray-400 mono">{selected.product?.sku}</p>
                    </div>
                  ) : (
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      {matchEditorItemId === item.id ? (
                        <div className="space-y-1.5">
                          <input
                            autoFocus
                            value={matchQuery}
                            onChange={(e) => setMatchQuery(e.target.value)}
                            placeholder="Search SKU or name"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-gray-400"
                          />
                          <div className="max-h-40 overflow-y-auto rounded border border-gray-200 bg-white">
                            {filteredProducts(matchQuery).map((product) => (
                              <button
                                key={product.id}
                                type="button"
                                className="w-full px-2 py-1.5 text-left hover:bg-gray-50"
                                onClick={() => {
                                  onSelectProduct(item.id, product.id);
                                  setMatchEditorItemId(null);
                                  setMatchQuery("");
                                }}
                              >
                                <span className="block text-xs text-gray-800 mono">{product.sku}</span>
                                <span className="block text-xs text-gray-500 truncate">{product.name}</span>
                              </button>
                            ))}
                            {filteredProducts(matchQuery).length === 0 && (
                              <p className="px-2 py-2 text-xs text-gray-400">No products found</p>
                            )}
                          </div>
                          <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-700"
                            onClick={() => {
                              setMatchEditorItemId(null);
                              setMatchQuery("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-blue-700 hover:underline"
                          onClick={() => setMatchEditorItemId(item.id)}
                          disabled={!!selectingProductItemId}
                        >
                          Select product
                        </button>
                      )}
                    </div>
                  )}
                </td>

                {/* Confidence */}
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={`text-xs ${CONFIDENCE_COLORS[item.confidence_band] ?? ""}`}
                  >
                    {item.confidence_band === "high" && "High"}
                    {item.confidence_band === "review" && "Review"}
                    {item.confidence_band === "unresolved" && "Unresolved"}
                  </Badge>
                  {hasWarning && !hasError && (
                    <span className="block text-xs text-amber-600 mt-0.5">has warnings</span>
                  )}
                </td>

                {/* Actions */}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  {item.status === "approved" ? (
                    <span className="text-xs text-green-600 font-medium">Approved</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => onApprove(item.id)}
                      disabled={loading || !!selectingProductItemId || item.confidence_band === "unresolved"}
                    >
                      Approve
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">
          No line items extracted for this session.
        </div>
      )}
    </div>
  );
}
