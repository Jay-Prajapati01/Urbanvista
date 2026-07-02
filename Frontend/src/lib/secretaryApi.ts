import type { MaintenanceRecord } from "./data";
import { apiFetch } from "./api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfTokenCache: string | null = null;

function isMutatingMethod(method?: string) {
  return MUTATING_METHODS.has(String(method || "GET").toUpperCase());
}

async function fetchCsrfToken() {
  const data = await apiFetch(`${API_BASE}/auth/csrf`, { method: "GET" });
  if (!data?.csrfToken) throw new Error("Failed to initialize CSRF token");
  csrfTokenCache = data.csrfToken;
  return csrfTokenCache;
}

async function fetchSecretaryAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const execute = async (retryOnCsrf: boolean): Promise<any> => {
    const method = String(options?.method || "GET").toUpperCase();
    const needsCsrf = isMutatingMethod(method);
    const csrfToken = needsCsrf ? csrfTokenCache || await fetchCsrfToken() : null;

    const headers = {
      "Content-Type": "application/json",
      ...(needsCsrf && csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
      ...options?.headers,
    };

    try {
      const res = await apiFetch(`${API_BASE}${endpoint}`, { ...options, method, headers });
      return res;
    } catch (err: any) {
      // If CSRF invalid, retry once after clearing token
      if (err?.info?.code === "CSRF_TOKEN_INVALID" && needsCsrf && retryOnCsrf) {
        csrfTokenCache = null;
        return execute(false);
      }
      throw err;
    }
  };

  return execute(true);
}

// ──── Type definitions ────
export interface Resident {
  id: string;
  name: string;
  email: string;
  houseId: string | null;
  memberId: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ──── Secretary Residents API ────
export const secretaryResidentsApi = {
  getAll: () => fetchSecretaryAPI<Resident[]>("/secretary/residents"),
  
  getById: (id: string) => fetchSecretaryAPI<Resident>(`/secretary/residents/${id}`),
  
  create: (data: { name: string; email: string; password: string; houseId: string }) =>
    fetchSecretaryAPI<{ message: string; resident: Resident; credentials: { email: string; password: string } }>(
      "/secretary/residents",
      { method: "POST", body: JSON.stringify(data) }
    ),
  
  update: (id: string, data: { name?: string; email?: string }) =>
    fetchSecretaryAPI<Resident>(`/secretary/residents/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchSecretaryAPI<{ message: string }>(`/secretary/residents/${id}`, { method: "DELETE" }),
};

// ──── Secretary Dashboard API (re-export filtered endpoints) ────
// Secretaries use the same endpoints as admin but with scope filtering on backend
export const secretaryDashboardApi = {
  getMetrics: () => fetchSecretaryAPI<{
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
  }>("/dashboard"),
};
