/**
 * API client — thin wrapper over fetch with org_id injection.
 * All errors include the server's error message for display in the UI.
 */

const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? "";
const AUTH_TOKEN_KEY = "synterix_access_token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string | number | boolean | undefined> } = {}
): Promise<T> {
  const { params, ...init } = options;

  const url = new URL(path, typeof window === "undefined" ? "http://localhost" : window.location.origin);
  if (ORG_ID) url.searchParams.set("org_id", ORG_ID);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(`${url.pathname}${url.search}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
      ...init.headers,
    },
    ...init,
  });

  if (!res.ok) {
    let errBody: { error?: string; detail?: string; details?: Record<string, unknown> } = {};
    try { errBody = await res.json(); } catch {}
    const msg = errBody.error ?? errBody.detail ?? `HTTP ${res.status}`;
    throw new ApiError(res.status, msg, errBody.details);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    signup: (body: { username: string; email: string; password: string }) =>
      request<import("./types").AuthTokenResponse>("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((res) => {
        setAuthToken(res.access_token);
        return res;
      }),
    login: (body: { identifier: string; password: string }) =>
      request<import("./types").AuthTokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((res) => {
        setAuthToken(res.access_token);
        return res;
      }),
    me: () => request<import("./types").AuthUser>("/api/v1/auth/me"),
    logout: () => clearAuthToken(),
  },

  sessions: {
    list: (status_filter?: string) =>
      request<{ sessions: import("./types").Session[]; total: number }>("/api/v1/sessions", {
        params: { status_filter },
      }),
    get: (id: string) =>
      request<import("./types").Session>(`/api/v1/sessions/${id}`),
    create: (body: { document_type?: string }) =>
      request<import("./types").Session>("/api/v1/sessions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    upload: (sessionId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      const url = new URL(`/api/v1/sessions/${sessionId}/upload`, typeof window === "undefined" ? "http://localhost" : window.location.origin);
      if (ORG_ID) url.searchParams.set("org_id", ORG_ID);
      return fetch(`${url.pathname}${url.search}`, {
        method: "POST",
        body: form,
        headers: {
          ...(getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {}),
        },
      }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new ApiError(r.status, e.detail ?? `Upload failed`, e.details);
        }
        return r.json();
      });
    },
    process: (sessionId: string) =>
      request(`/api/v1/sessions/${sessionId}/process`, { method: "POST" }),
    approve: (sessionId: string, format: "json" | "csv" = "json") =>
      request(`/api/v1/sessions/${sessionId}/approve`, {
        method: "POST",
        params: { export_format: format },
      }),
    createSample: () =>
      request<import("./types").SeedSampleSessionResponse>("/api/v1/sessions/sample", {
        method: "POST",
      }),
  },

  review: {
    getItems: (sessionId: string) =>
      request<{ items: import("./types").LineItem[]; total: number }>(
        `/api/v1/review/sessions/${sessionId}/items`
      ),
    updateItem: (
      itemId: string,
      body: {
        quantity?: number;
        unit?: string;
        selected_product_id?: string;
        correction_reason?: string;
        status?: string;
      }
    ) => request(`/api/v1/review/items/${itemId}`, { method: "PATCH", body: JSON.stringify(body) }),
    approveItem: (itemId: string) =>
      request(`/api/v1/review/items/${itemId}/approve`, { method: "POST" }),
  },

  catalog: {
    listProducts: (q?: string) =>
      request<{ products: import("./types").Product[]; total: number }>("/api/v1/catalog/products", {
        params: { q },
      }),
    createProduct: (body: Partial<import("./types").Product>) =>
      request("/api/v1/catalog/products", { method: "POST", body: JSON.stringify(body) }),
    updateProduct: (id: string, body: Partial<import("./types").Product>) =>
      request(`/api/v1/catalog/products/${id}`, { method: "PUT", body: JSON.stringify(body) }),
    deleteProduct: (id: string) =>
      request(`/api/v1/catalog/products/${id}`, { method: "DELETE" }),
    importProductsCsv: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const url = new URL(`/api/v1/catalog/products/import-csv`, typeof window === "undefined" ? "http://localhost" : window.location.origin);
      if (ORG_ID) url.searchParams.set("org_id", ORG_ID);
      return fetch(`${url.pathname}${url.search}`, { method: "POST", body: form }).then(async (r) => {
        if (!r.ok) {
          const e = await r.json().catch(() => ({}));
          throw new ApiError(r.status, e.detail ?? "CSV import failed", e.details);
        }
        return r.json();
      });
    },
    seedSampleProducts: () =>
      request<import("./types").SeedSampleCatalogResponse>("/api/v1/catalog/products/seed-sample", {
        method: "POST",
      }),

    listSynonyms: () =>
      request<{ synonyms: import("./types").Synonym[] }>("/api/v1/catalog/synonyms"),
    createSynonym: (body: { term: string; maps_to: string; type: string }) =>
      request("/api/v1/catalog/synonyms", { method: "POST", body: JSON.stringify(body) }),
    deleteSynonym: (id: string) =>
      request(`/api/v1/catalog/synonyms/${id}`, { method: "DELETE" }),

    listRules: () =>
      request<{ rules: import("./types").Rule[] }>("/api/v1/catalog/rules"),
    createRule: (body: { name: string; type: string; config: Record<string, unknown>; severity: string }) =>
      request("/api/v1/catalog/rules", { method: "POST", body: JSON.stringify(body) }),
    toggleRule: (id: string, is_active: boolean) =>
      request(`/api/v1/catalog/rules/${id}`, {
        method: "PATCH",
        params: { is_active },
      }),

    listPricingRules: () =>
      request<{ rules: import("./types").PricingRule[] }>("/api/v1/catalog/pricing-rules"),
    createPricingRule: (body: {
      provider: string;
      billing_model_name: string;
      unit_type: import("./types").PricingRule["unit_type"];
      input_cost_per_unit?: number | null;
      output_cost_per_unit?: number | null;
      request_cost?: number | null;
      effective_from: string;
      effective_to?: string | null;
      is_temporary?: boolean;
      source_url?: string | null;
      notes?: string | null;
    }) => request<import("./types").PricingRule>("/api/v1/catalog/pricing-rules", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    listModelAliases: () =>
      request<{ aliases: import("./types").ModelAlias[] }>("/api/v1/catalog/model-aliases"),
    createModelAlias: (body: {
      provider: string;
      logged_model_name: string;
      billing_model_name: string;
      effective_from: string;
      effective_to?: string | null;
    }) => request<import("./types").ModelAlias>("/api/v1/catalog/model-aliases", {
      method: "POST",
      body: JSON.stringify(body),
    }),
    getPricingDiagnostics: () =>
      request<import("./types").PricingDiagnostics>("/api/v1/catalog/pricing-diagnostics"),
  },

  quality: {
    getStats: (days = 30) =>
      request<import("./types").QualityStats>("/api/v1/quality/stats", { params: { days } }),
    getDiagnostics: (days = 30) =>
      request<import("./types").QualityDiagnostics>("/api/v1/quality/diagnostics", { params: { days } }),
    getSessionTelemetry: (sessionId: string) =>
      request(`/api/v1/quality/sessions/${sessionId}/telemetry`),
  },
};
