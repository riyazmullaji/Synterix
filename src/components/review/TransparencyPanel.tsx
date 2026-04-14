"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CONFIDENCE_COLORS, SEVERITY_COLORS } from "@/lib/utils";
import type { LineItem, CandidateMatch } from "@/lib/types";

interface TransparencyPanelProps {
  item: LineItem | null;
  onSelectProduct: (productId: string) => void;
  onMarkUnresolved: () => void;
}

export function TransparencyPanel({ item, onSelectProduct, onMarkUnresolved }: TransparencyPanelProps) {
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);

  if (!item) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-gray-400">
        Select a line item to see match details
      </div>
    );
  }

  const selected = item.candidates.find((c) => c.is_selected);
  const alternatives = item.candidates.filter((c) => !c.is_selected);

  return (
    <div className="h-full overflow-y-auto space-y-5 px-4 py-4 text-sm">
      {/* Confidence band */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Confidence</p>
        <Badge
          variant="outline"
          className={CONFIDENCE_COLORS[item.confidence_band] ?? "text-gray-500"}
        >
          {item.confidence_band === "high" && "High confidence"}
          {item.confidence_band === "review" && "Review recommended"}
          {item.confidence_band === "unresolved" && "Unresolved"}
        </Badge>
      </div>

      {/* Selected match */}
      {selected && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Selected Match</p>
          <MatchCard
            candidate={selected}
            isSelected
            expanded={expandedCandidate === selected.id}
            onToggle={() => setExpandedCandidate(
              expandedCandidate === selected.id ? null : selected.id
            )}
            onSelect={() => {}}
          />
        </div>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Alternatives ({alternatives.length})
          </p>
          <div className="space-y-2">
            {alternatives.map((cand) => (
              <MatchCard
                key={cand.id}
                candidate={cand}
                isSelected={false}
                expanded={expandedCandidate === cand.id}
                onToggle={() => setExpandedCandidate(
                  expandedCandidate === cand.id ? null : cand.id
                )}
                onSelect={() => onSelectProduct(cand.product_id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Validation issues */}
      {item.validation_issues.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Validation Issues ({item.validation_issues.length})
          </p>
          <div className="space-y-1.5">
            {item.validation_issues.map((issue) => (
              <div
                key={issue.id}
                className={`rounded px-3 py-2 text-xs ${SEVERITY_COLORS[issue.severity] ?? "bg-gray-50 text-gray-600"}`}
              >
                <p className="font-medium">{issue.type.replaceAll("_", " ")}</p>
                <p className="mt-0.5 opacity-90">{issue.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source evidence */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Source Text</p>
        <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-xs mono text-gray-700 leading-relaxed">
          {item.raw_description}
        </div>
        {item.raw_sku && (
          <p className="text-xs text-gray-400 mt-1">SKU hint: {item.raw_sku}</p>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2 pt-2 border-t border-gray-100">
        {item.status !== "unresolved" && (
          <Button variant="ghost" size="sm" onClick={onMarkUnresolved} className="w-full justify-center">
            Mark Unresolved
          </Button>
        )}
      </div>
    </div>
  );
}

function MatchCard({
  candidate, isSelected, expanded, onToggle, onSelect,
}: {
  candidate: CandidateMatch;
  isSelected: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const score = candidate.score_total ?? 0;
  const scoreColor =
    score >= 0.85 ? "text-green-700" : score >= 0.6 ? "text-amber-700" : "text-red-600";

  return (
    <div
      className={`border rounded overflow-hidden ${
        isSelected ? "border-gray-300" : "border-gray-200"
      }`}
    >
      <div
        className="flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">{candidate.product?.name}</p>
          <p className="text-xs text-gray-400 mt-0.5 mono">{candidate.product?.sku}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={`font-medium tabular-nums ${scoreColor}`}>
            {(score * 100).toFixed(0)}
          </p>
          <p className="text-xs text-gray-400">score</p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-3 py-2.5 bg-gray-50 space-y-3">
          {/* Score breakdown */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1.5">Score breakdown</p>
            <div className="space-y-1">
              {Object.entries(candidate.score_breakdown).map(([signal, value]) => (
                <div key={signal} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-24 shrink-0 capitalize">
                    {signal.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-700 rounded-full"
                      style={{ width: `${Math.min(100, (value / 1) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs tabular-nums text-gray-600 w-10 text-right">
                    {value.toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          {candidate.explanation?.signals?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Why this candidate</p>
              <ul className="space-y-0.5">
                {candidate.explanation.signals.map((sig, i) => (
                  <li key={i} className="text-xs text-gray-600">+ {sig}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Unit */}
          {candidate.product?.unit && (
            <p className="text-xs text-gray-500">
              Catalog unit: <span className="font-medium text-gray-700">{candidate.product.unit}</span>
            </p>
          )}

          {/* Select action */}
          {!isSelected && (
            <Button size="sm" variant="secondary" onClick={onSelect} className="w-full justify-center">
              Select This Product
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
