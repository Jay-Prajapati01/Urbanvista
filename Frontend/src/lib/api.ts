import type { House, Member, Vehicle, MaintenanceRecord, Expenditure, Secretary } from "./data";

type ApiError = {
  message: string;
  code?: string;
  status?: number;
  details?: any;
};

export async function apiFetch(input: RequestInfo, init?: RequestInit, timeout = 10_000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(input, { ...init, credentials: "include", signal: controller.signal });
    clearTimeout(id);
    const contentType = res.headers.get("content-type") || "";
    let json: any = null;
    if (contentType.includes("application/json")) {
      json = await res.json();
    }
    if (!res.ok) {
      const err: ApiError = {
        message: json?.message || res.statusText || "Request failed",
        code: json?.code,
        status: res.status,
        details: json?.details,
      };
      const e = new Error(err.message) as Error & { info?: ApiError };
      e.info = err;
      throw e;
    }
    return json ?? null;
  } catch (err: any) {
    if (err.name === "AbortError") {
      const e = new Error("Request timed out");
      (e as any).info = { message: "Request timed out", code: "TIMEOUT" };
      throw e;
    }
    throw err;
  }
  }
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfTokenCache: string | null = null;

function isMutatingMethod(method?: string) {
  return MUTATING_METHODS.has(String(method || "GET").toUpperCase());
}

async function fetchCsrfToken() {
  const res = await fetch(`${API_BASE}/auth/csrf`, {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("Failed to initialize CSRF token");
  }

  const data = await res.json().catch(() => ({} as { csrfToken?: string }));
  if (!data.csrfToken) {
    throw new Error("Failed to initialize CSRF token");
  }

  csrfTokenCache = data.csrfToken;
  return csrfTokenCache;
}

// ──── Generic fetch wrapper ────
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const execute = async (retryOnCsrf: boolean): Promise<Response> => {
    const method = String(options?.method || "GET").toUpperCase();
    const needsCsrf = isMutatingMethod(method);
    const csrfToken = needsCsrf ? csrfTokenCache || await fetchCsrfToken() : null;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(needsCsrf && csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
        ...options?.headers,
      },
    });

    if (res.status === 403 && needsCsrf && retryOnCsrf) {
      const errBody = await res.json().catch(() => ({} as { code?: string }));
      if (errBody.code === "CSRF_TOKEN_INVALID") {
        csrfTokenCache = null;
        return execute(false);
      }
    }

    return res;
  };

  const res = await execute(true);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    let message = error.message || `Request failed (${res.status})`;

    if (Array.isArray(error.allowedBlocks) && error.allowedBlocks.length > 0) {
      message = `${message}. Allowed blocks: ${error.allowedBlocks.join(", ")}`;
    }

    throw new Error(message);
  }

  return res.json();
}

// ──── Auth API ────
export const authApi = {
  login: (email: string, password: string) =>
    fetchAPI<{
      tokenType: string;
      expiresIn: number;
      user: {
        id: string;
        name: string;
        email: string;
        username?: string | null;
        role: string;
        mustResetPassword?: boolean;
      };
    }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  verify: () =>
    fetchAPI<{
      valid: boolean;
      user: {
        id: string;
        name: string;
        email: string;
        username?: string | null;
        role: string;
        mustResetPassword?: boolean;
      };
    }>(
      "/auth/verify",
      { method: "POST" }
    ),
  me: () =>
    fetchAPI<{
      user: {
        id: string;
        name: string;
        email: string;
        username?: string | null;
        role: string;
        mustResetPassword?: boolean;
      };
      effectiveScope: {
        role: string;
        houseIds: string[];
        blocks: string[];
        scopeVersion: number;
      };
    }>("/auth/me"),
  effectiveScope: () =>
    fetchAPI<{
      role: string;
      houseIds: string[];
      blocks: string[];
      scopeVersion: number;
    }>("/auth/effective-scope"),
  logout: () => fetchAPI<{ message: string }>("/auth/logout", { method: "POST" }),
};

// ──── Houses API ────
export const housesApi = {
  getAll: () => fetchAPI<House[]>("/houses"),
  getById: (id: string) => fetchAPI<House>(`/houses/${id}`),
  create: (data: Partial<House>) =>
    fetchAPI<House>("/houses", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<House>) =>
    fetchAPI<House>(`/houses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/houses/${id}`, { method: "DELETE" }),
};

// ──── Members API ────
export const membersApi = {
  getAll: () => fetchAPI<Member[]>("/members"),
  getById: (id: string) => fetchAPI<Member>(`/members/${id}`),
  create: (data: Partial<Member>) =>
    fetchAPI<Member>("/members", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Member>) =>
    fetchAPI<Member>(`/members/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/members/${id}`, { method: "DELETE" }),
};

// ──── Vehicles API ────
export const vehiclesApi = {
  getAll: () => fetchAPI<Vehicle[]>("/vehicles"),
  getById: (id: string) => fetchAPI<Vehicle>(`/vehicles/${id}`),
  create: (data: Partial<Vehicle>) =>
    fetchAPI<Vehicle>("/vehicles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Vehicle>) =>
    fetchAPI<Vehicle>(`/vehicles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/vehicles/${id}`, { method: "DELETE" }),
};

// ──── Maintenance API ────
export const maintenanceApi = {
  getAll: () => fetchAPI<MaintenanceRecord[]>("/maintenance"),
  getById: (id: string) => fetchAPI<MaintenanceRecord>(`/maintenance/${id}`),
  create: (data: Partial<MaintenanceRecord>) =>
    fetchAPI<MaintenanceRecord>("/maintenance", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<MaintenanceRecord>) =>
    fetchAPI<MaintenanceRecord>(`/maintenance/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/maintenance/${id}`, { method: "DELETE" }),
};

// ──── Expenditures API ────
export const expendituresApi = {
  getAll: () => fetchAPI<Expenditure[]>("/expenditures"),
  getById: (id: string) => fetchAPI<Expenditure>(`/expenditures/${id}`),
  create: (data: Partial<Expenditure>) =>
    fetchAPI<Expenditure>("/expenditures", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Partial<Expenditure>) =>
    fetchAPI<Expenditure>(`/expenditures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchAPI<{ message: string }>(`/expenditures/${id}`, { method: "DELETE" }),
};

// ──── Secretaries API ────
export const secretariesApi = {
  getAll: (status?: string) => {
    const url = status ? `/admin/secretaries?status=${status}` : "/admin/secretaries";
    return fetchAPI<Secretary[]>(url);
  },
  getById: (id: string) => fetchAPI<Secretary>(`/admin/secretaries/${id}`),
  create: (data: {
    name: string;
    email: string;
    username: string;
    temporaryPassword: string;
    assignments: Array<{
      assignmentType: "block";
      block: string;
    }>;
  }) =>
    fetchAPI<Secretary>("/admin/secretaries", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; email?: string; status?: string }) =>
    fetchAPI<Secretary>(`/admin/secretaries/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  resetPassword: (id: string, temporaryPassword: string) =>
    fetchAPI<{ message: string }>(`/admin/secretaries/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ temporaryPassword }),
    }),
  updateAssignments: (id: string, assignments: Array<{
    assignmentType: "block";
    block: string;
  }>) =>
    fetchAPI<Secretary>(`/admin/secretaries/${id}/assignments`, {
      method: "PUT",
      body: JSON.stringify({ assignments }),
    }),
  disable: (id: string) =>
    fetchAPI<{ message: string }>(`/admin/secretaries/${id}/disable`, { method: "POST" }),
  enable: (id: string) =>
    fetchAPI<{ message: string }>(`/admin/secretaries/${id}/enable`, { method: "POST" }),
};

// ──── Dashboard API ────
export interface DashboardMetrics {
  totalHouses: number;
  occupiedHouses: number;
  vacantHouses: number;
  maintenanceHouses: number;
  totalMembers: number;
  totalBilled: number;
  totalCollected: number;
  pendingAmount: number;
  collectionRate: number;
  totalExpenses: number;
  netBalance: number;
  totalVehicles: number;
  twoWheelers: number;
  fourWheelers: number;
}

export const dashboardApi = {
  getMetrics: () => fetchAPI<DashboardMetrics>("/dashboard"),
};

// ──── Reports API ────
export interface ReportsSummary {
  houses: House[];
  members: Member[];
  vehicles: Vehicle[];
  maintenanceRecords: MaintenanceRecord[];
  expenditures: Expenditure[];
}

export const reportsApi = {
  getSummary: () => fetchAPI<ReportsSummary>("/reports/summary"),
  getHousewiseMaintenance: () => fetchAPI<Record<string, MaintenanceRecord[]>>("/reports/housewise-maintenance"),
  getLatePayments: () => fetchAPI<MaintenanceRecord[]>("/reports/late-payments"),
  getVacantProperties: () => fetchAPI<House[]>("/reports/vacant-properties"),
};
