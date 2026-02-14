import type { House, Member, Vehicle, MaintenanceRecord, Expenditure } from "./data";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ──── Generic fetch wrapper ────
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("urbanvista-token");

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

// ──── Auth API ────
export const authApi = {
  login: (email: string, password: string) =>
    fetchAPI<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      "/auth/login",
      { method: "POST", body: JSON.stringify({ email, password }) }
    ),
  verify: () =>
    fetchAPI<{ valid: boolean; user: { id: string; name: string; email: string; role: string } }>(
      "/auth/verify",
      { method: "POST" }
    ),
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
