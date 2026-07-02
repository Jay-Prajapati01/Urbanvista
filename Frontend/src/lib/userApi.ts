import type { MaintenanceRecord, ReceiptRecord } from "./data";
import { apiFetch } from "./api";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const CSRF_HEADER = "x-csrf-token";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfTokenCache: string | null = null;

function isMutatingMethod(method?: string) {
  return MUTATING_METHODS.has(String(method || "GET").toUpperCase());
}

async function fetchCsrfToken() {
  const data = await apiFetch(`${API_BASE}/user-auth/csrf`, { method: "GET" });
  if (!data?.csrfToken) throw new Error("Failed to initialize CSRF token");
  csrfTokenCache = data.csrfToken;
  return csrfTokenCache;
}

async function fetchUserAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const execute = async (retryOnCsrf: boolean): Promise<Response> => {
    const method = String(options?.method || "GET").toUpperCase();
    const needsCsrf = isMutatingMethod(method);
    const csrfToken = needsCsrf ? csrfTokenCache || await fetchCsrfToken() : null;

    // Authentication is provided via secure httpOnly cookies set by the backend.
    // Do not read or set auth tokens from localStorage.
    const headers = {
      "Content-Type": "application/json",
      ...(needsCsrf && csrfToken ? { [CSRF_HEADER]: csrfToken } : {}),
      ...options?.headers,
    };

    const res = await apiFetch(`${API_BASE}${endpoint}`, { ...options, method, headers });

    if (res.status === 403 && needsCsrf && retryOnCsrf) {
      const errBody = await res.json().catch(() => ({} as { code?: string }));
      if (errBody.code === "CSRF_TOKEN_INVALID") {
        csrfTokenCache = null;
        return execute(false);
      }
    }

    return res;
  };

  // apiFetch already returns parsed json or throws; execute(true) returned response previously
  // When using apiFetch we call execute and return the parsed JSON
  const result = await execute(true);
  return result;
}

// ──── User Auth API ────
export const userAuthApi = {
  login: (email: string, password: string) =>
    fetchUserAPI<{
      user: { id: string; name: string; email: string; houseId: string | null; memberId: string | null; role: string };
    }>("/user-auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  signup: (name: string, email: string, password: string) =>
    fetchUserAPI<{
      user: { id: string; name: string; email: string; houseId: string | null; memberId: string | null; role: string };
    }>("/user-auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),
  verify: () =>
    fetchUserAPI<{
      valid: boolean;
      user: { id: string; name: string; email: string; houseId: string | null; memberId: string | null; role: string };
    }>("/user-auth/verify", { method: "POST" }),
  googleStatus: () =>
    fetchUserAPI<{
      configured: boolean;
    }>("/user-auth/google/status"),
  logout: () => fetchUserAPI<{ message: string }>("/user-auth/logout", { method: "POST" }),
};

// ──── User Dashboard API ────
export interface UserDashboardData {
  house: {
    id: string;
    block: string;
    houseNumber: string;
    floor: number;
    status: string;
    ownerName: string;
    ownerContact: string;
    notes: string;
  } | null;
  members: Array<{
    id: string;
    name: string;
    role: string;
    phone: string;
    email: string;
    isActive: boolean;
  }>;
  vehicles: Array<{
    id: string;
    vehicleNumber: string;
    type: string;
    color: string;
  }>;
  maintenanceRecords: MaintenanceRecord[];
  paymentSummary: {
    totalBilled: number;
    totalPaid: number;
    pendingAmount: number;
    totalRecords: number;
    paidRecords: number;
    pendingRecords: number;
  };
  message?: string;
}

export const userDashboardApi = {
  getData: () => fetchUserAPI<UserDashboardData>("/user/dashboard"),
  updateHouse: (data: { ownerContact?: string; notes?: string }) =>
    fetchUserAPI<UserDashboardData["house"]>("/user/dashboard/house", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  addMember: (data: { name: string; role: "Owner" | "Tenant" | "Family"; phone?: string; email?: string }) =>
    fetchUserAPI<UserDashboardData["members"][number]>("/user/dashboard/members", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  addVehicle: (data: { vehicleNumber: string; type: "Two Wheeler" | "Four Wheeler"; color?: string }) =>
    fetchUserAPI<UserDashboardData["vehicles"][number]>("/user/dashboard/vehicles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ──── User Payments API ────
export interface RazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  receiptNumber: string;
}

export interface RazorpayVerifyPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  maintenance_id?: string;
  amount?: number;
}

export interface RazorpayAttemptPayload {
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  status: "failed" | "cancelled";
  reason?: string;
}

export const userPaymentsApi = {
  getAll: () => fetchUserAPI<MaintenanceRecord[]>("/user/payments"),
  getMaintenanceBills: () => fetchUserAPI<MaintenanceRecord[]>("/maintenance/user"),
  getReceipts: () => fetchUserAPI<ReceiptRecord[]>("/user/payments/receipts"),
  getReceiptsFromReceiptsApi: () => fetchUserAPI<ReceiptRecord[]>("/receipts/user"),
  createOrder: (maintenanceRecordId: string) =>
    fetchUserAPI<RazorpayOrderResponse>("/user/payments/create-order", {
      method: "POST",
      body: JSON.stringify({ maintenanceRecordId }),
    }),
  verifyPayment: (data: RazorpayVerifyPayload) =>
    fetchUserAPI<{
      success: boolean;
      message: string;
      paymentId: string;
      receiptId?: string | null;
      receiptNumber?: string | null;
      receipt?: ReceiptRecord | null;
      maintenanceStatus?: string | null;
    }>("/user/payments/verify", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  markAttempt: (data: RazorpayAttemptPayload) =>
    fetchUserAPI<{ success: boolean; message: string; paymentId?: string }>("/user/payments/attempt", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
