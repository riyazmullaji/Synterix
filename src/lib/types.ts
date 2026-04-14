// ─── Core domain types mirroring API schemas ─────────────────────────────────

export type SessionStatus =
  | "pending" | "extracting" | "structuring" | "matching"
  | "validating" | "review" | "approved" | "exported" | "failed";

export type ConfidenceBand = "high" | "review" | "unresolved";

export type LineItemStatus = "pending" | "approved" | "corrected" | "unresolved" | "skipped";

export interface Session {
  id: string;
  org_id: string;
  status: SessionStatus;
  document_type: string | null;
  total_line_items: number;
  approved_count: number;
  correction_count: number;
  unresolved_count: number;
  error_message: string | null;
  stage_latencies: Record<string, number>;
  approved_at: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  unit: string | null;
  moq: number | null;
  pack_size: number | null;
  attributes: Record<string, unknown>;
  is_active: boolean;
}

export interface CandidateMatch {
  id: string;
  product_id: string;
  product: Product;
  is_selected: boolean;
  rank: number;
  score_total: number;
  score_breakdown: Record<string, number>;
  explanation: {
    signals: string[];
    why_selected: string;
    rejected_reasons: string[];
  };
  retrieval_method: string | null;
  confidence_band: ConfidenceBand;
}

export interface ValidationIssue {
  id: string;
  type: string;
  severity: "error" | "warning" | "info";
  message: string;
  details: Record<string, unknown>;
  resolved: boolean;
}

export interface LineItem {
  id: string;
  session_id: string;
  line_number: number;
  raw_description: string;
  normalized_description: string | null;
  raw_quantity: string | null;
  quantity: number | null;
  raw_unit: string | null;
  unit: string | null;
  raw_sku: string | null;
  extra_fields: Record<string, unknown>;
  confidence_band: ConfidenceBand;
  status: LineItemStatus;
  correction_reason: string | null;
  approved_at: string | null;
  candidates: CandidateMatch[];
  validation_issues: ValidationIssue[];
}

export interface Synonym {
  id: string;
  term: string;
  maps_to: string;
  type: "description" | "unit" | "sku";
  created_at: string;
}

export interface Rule {
  id: string;
  name: string;
  type: string;
  config: Record<string, unknown>;
  severity: "error" | "warning" | "info";
  is_active: boolean;
  created_at: string;
}

export type PricingRuleStatus = "active" | "scheduled" | "expired";

export interface PricingRule {
  id: string;
  provider: string;
  billing_model_name: string;
  unit_type: "tokens" | "characters" | "requests" | "minutes" | "none";
  input_cost_per_unit: number | null;
  output_cost_per_unit: number | null;
  request_cost: number | null;
  effective_from: string;
  effective_to: string | null;
  is_temporary: boolean;
  source_url: string | null;
  notes: string | null;
  version: number;
  created_at: string;
  status: PricingRuleStatus;
  overlap_count?: number;
}

export interface ModelAlias {
  id: string;
  provider: string;
  logged_model_name: string;
  billing_model_name: string;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  overlap_count?: number;
}

export interface PricingDiagnostics {
  models_seen: Array<{
    provider: string;
    model_name: string;
    usage_rows: number;
    null_cost_rows: number;
    total_cost: number;
  }>;
  models_missing_pricing: Array<{
    provider: string;
    logged_model_name: string;
    billing_model_name: string;
    usage_rows: number;
  }>;
  null_cost_rows: number;
  null_cost_total: number;
  overlaps: Array<{
    provider: string;
    billing_model_name: string;
    current_row_id: string;
    overlapping_row_id: string;
    effective_from: string;
    effective_to: string | null;
    overlapping_effective_from: string;
    overlapping_effective_to: string | null;
  }>;
}

export interface QualityStats {
  period_days: number;
  total_sessions: number;
  total_line_items: number;
  first_pass_approval_rate: number;
  correction_rate: number;
  unresolved_rate: number;
  avg_time_to_approve_seconds: number;
  top_1_precision_proxy: number;
  correction_reason_breakdown: Record<string, number>;
  by_file_type: Record<string, { sessions: number; correction_rate: number; high_conf_rate: number }>;
  low_confidence_performance: {
    review_band_total: number;
    review_band_auto_approved: number;
    unresolved_band_total: number;
    unresolved_resolved: number;
  };
  most_overridden_matches: Array<{ product_name: string; sku: string; override_count: number }>;
}

export interface QualityStageBreakdown {
  stage: string;
  runs: number;
  successes: number;
  failures: number;
  success_rate: number;
  failure_rate: number;
  avg_latency_ms: number | null;
}

export interface QualityStrategyBreakdown {
  strategy_name: string;
  extractor_strategy: string;
  json_structuring_strategy: string;
  embedding_strategy: string;
  retrieval_strategy: string;
  ranking_strategy: string;
  sessions: number;
  first_pass: number;
  corrected: number;
  unresolved: number;
  first_pass_rate: number;
  correction_rate: number;
  unresolved_rate: number;
  avg_approve_latency_seconds: number | null;
}

export interface QualityMatchingDiagnostics {
  total_decisions: number;
  top1_rate: number;
  top3_rate: number;
  not_retrieved_rate: number;
  wrong_ranking_rate: number;
  avg_selected_score: number | null;
}

export interface QualityErrorBreakdown {
  corrections: Array<{ category: string; count: number }>;
  stage_failures: Array<{ stage: string; count: number }>;
}

export interface QualityCalibrationBucket {
  bucket: string;
  items: number;
  resolved_rate: number;
  approved_rate: number;
  corrected_rate: number;
  unresolved_rate: number;
}

export type QualityCalibration = QualityCalibrationBucket[];

export interface QualityFileTypeIntelligence {
  file_type: string;
  extractor_used: string;
  documents: number;
  ocr_rate: number;
  avg_confidence: number | null;
  avg_parse_failures: number;
  sample_meta: Record<string, unknown>;
}

export interface QualityTraceSession {
  id: string;
  status: string;
  document_type: string | null;
  total_line_items: number;
  unresolved_count: number;
  error_message: string | null;
  created_at: string;
  file_type: string | null;
  extractor_used: string | null;
  strategy_name: string | null;
  failure_stage: string | null;
  error_code: string | null;
  failure_message: string | null;
  stage_latencies: Record<string, unknown>;
}

export interface QualityDiagnostics {
  pipeline_breakdown: QualityStageBreakdown[];
  matching_diagnostics: QualityMatchingDiagnostics;
  failure_explorer: {
    recent_sessions: QualityTraceSession[];
  };
  error_breakdown: {
    correction_reasons: Array<{ reason: string; count: number }>;
    stage_failure_reasons: Array<{ stage: string; error_code: string; count: number }>;
  };
  confidence_calibration: QualityCalibration;
  strategy_comparison: Array<{
    strategy_name: string;
    extractor_strategy: string;
    json_structuring_strategy: string;
    embedding_strategy: string;
    retrieval_strategy: string;
    ranking_strategy: string;
    sessions: number;
    approved_rate: number;
    correction_rate: number;
    unresolved_rate: number;
    total_cost: number;
  }>;
  advanced: {
    collapsed_default: boolean;
    cost_efficiency: {
      total_cost: number;
      cost_per_session: number;
      model_calls: number;
    };
  };
}
