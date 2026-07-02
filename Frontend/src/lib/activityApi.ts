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

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function toQueryString(params: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.append(key, String(value));
  });
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : "";
}

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
    throw new Error(error.message || `Request failed (${res.status})`);
  }

  return res.json();
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  description: string;
  oldValue: JsonValue | null;
  newValue: JsonValue | null;
  ipAddress: string;
  userAgent: string;
  metadata: JsonValue | null;
  createdAt: string;
}

export interface LoginHistory {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  loginTime: string;
  logoutTime: string | null;
  ipAddress: string;
  userAgent: string;
  deviceFingerprint: string;
  status: "success" | "failed" | "blocked";
  failureReason: string;
  sessionId: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  secretaryId: string;
  secretaryName: string;
  maintenanceRecordId: string;
  houseId: string;
  houseNumber: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  paymentMethod: string;
  receiptNumber: string;
  notes: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "payment" | "login" | "crud";
  isRead: boolean;
  readAt: string;
  actionUrl: string;
  metadata: JsonValue | null;
  createdAt: string;
}

export interface SecretaryActivity {
  id: string;
  secretaryId: string;
  date: string;
  totalLogins: number;
  totalLogouts: number;
  totalHousesManaged: number;
  totalMembersAdded: number;
  totalMembersUpdated: number;
  totalMembersDeleted: number;
  totalVehiclesAdded: number;
  totalMaintenanceCreated: number;
  totalMaintenanceUpdated: number;
  totalPaymentsCollected: number;
  totalPaymentAmount: number;
  totalExpendituresAdded: number;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  activity: {
    total: number;
    byType: Record<string, number>;
    recent: ActivityLog[];
  };
  logins: {
    success: number;
    failed: number;
    blocked: number;
  };
  payments: {
    total: number;
    successful: number;
    pending: number;
    failed: number;
  };
  notifications: {
    unread: number;
    items: Notification[];
  };
  secretaries: Record<string, {
    logins: number;
    actions: number;
    payments: number;
    amount: number;
  }>;
  timestamp: string;
}

export const activityApi = {
  getLogs: (params?: {
    page?: number;
    limit?: number;
    userId?: string;
    action?: string;
    resourceType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => fetchAPI<{
    logs: ActivityLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>("/activity/logs", {
    method: "POST",
    body: JSON.stringify(params || {}),
  }),

  getLogStats: (days = 7) => 
    fetchAPI<{
      total: number;
      byAction: Record<string, number>;
      byResourceType: Record<string, number>;
      daily: Record<string, number>;
    }>(`/activity/logs/stats?days=${days}`),

  getLoginHistory: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    userId?: string;
    status?: string;
    days?: number;
    startDate?: string;
    endDate?: string;
  }) => fetchAPI<{
    history: LoginHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/activity/login-history${toQueryString({
    page: params?.page,
    limit: params?.limit,
    role: params?.role,
    userId: params?.userId,
    status: params?.status,
    days: params?.days,
    startDate: params?.startDate,
    endDate: params?.endDate,
  })}`),

  getLoginStats: (params?: {
    days?: number;
    role?: string;
    status?: string;
    userId?: string;
    block?: string;
    search?: string;
  }) => 
    fetchAPI<{
      total: number;
      successful: number;
      failed: number;
      blocked: number;
      byUser: Record<string, number>;
      byDay: Record<string, number>;
    }>(`/activity/login-history/stats${toQueryString({
      days: params?.days,
      role: params?.role,
      status: params?.status,
      userId: params?.userId,
      block: params?.block,
      search: params?.search,
    })}`),

  getActiveSessions: (params?: {
    role?: string;
    status?: string;
    userId?: string;
    days?: number;
    block?: string;
    search?: string;
  }) => 
    fetchAPI<LoginHistory[]>(`/activity/login-history/active-sessions${toQueryString({
      role: params?.role,
      status: params?.status,
      userId: params?.userId,
      days: params?.days,
      block: params?.block,
      search: params?.search,
    })}`),

  getSecretaryActivity: (days = 30) => 
    fetchAPI<SecretaryActivity[]>(`/activity/secretaries?days=${days}`),

  getSecretaryActivityById: (id: string, days = 30) => 
    fetchAPI<{
      secretary: Record<string, unknown> | null;
      activity: SecretaryActivity[];
    }>(`/activity/secretaries/${id}?days=${days}`),

  getSecretaryDetailedActivity: (id: string, days = 7) => 
    fetchAPI<{
      activityLogs: ActivityLog[];
      loginHistory: LoginHistory[];
      payments: PaymentTransaction[];
    }>(`/activity/secretaries/${id}/detailed?days=${days}`),

  getPayments: (params?: {
    page?: number;
    limit?: number;
    secretaryId?: string;
    houseId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) => fetchAPI<{
    payments: PaymentTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/activity/payments`),

  getPaymentStats: (days = 30) => 
    fetchAPI<{
      totalTransactions: number;
      totalAmount: number;
      successful: number;
      failed: number;
      pending: number;
      bySecretary: Record<string, number>;
      byDay: Record<string, number>;
    }>(`/activity/payments/stats?days=${days}`),

  getNotifications: (params?: {
    page?: number;
    limit?: number;
    unreadOnly?: boolean;
  }) => fetchAPI<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
    page: number;
    limit: number;
    totalPages: number;
  }>(`/activity/notifications`),

  getRealtimeNotifications: (lastCheck?: string) => 
    fetchAPI<{
      notifications: Notification[];
      count: number;
      timestamp: string;
    }>(`/activity/notifications/realtime${lastCheck ? `?lastCheck=${lastCheck}` : ""}`),

  markNotificationRead: (id: string) => 
    fetchAPI<{ message: string }>(`/activity/notifications/${id}/read`, { method: "PATCH" }),

  markAllNotificationsRead: () => 
    fetchAPI<{ message: string }>("/activity/notifications/read-all", { method: "PATCH" }),

  deleteNotification: (id: string) => 
    fetchAPI<{ message: string }>(`/activity/notifications/${id}`, { method: "DELETE" }),

  getDashboardSummary: () => 
    fetchAPI<DashboardSummary>("/activity/dashboard-summary"),
};
