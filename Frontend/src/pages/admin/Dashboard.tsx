import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { dashboardApi, maintenanceApi, expendituresApi } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/api";
import type { MaintenanceRecord, Expenditure } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Car,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  CircleDot,
  Loader2,
} from "lucide-react";

const DEFAULT_METRICS: DashboardMetrics = {
  totalHouses: 0,
  occupiedHouses: 0,
  vacantHouses: 0,
  maintenanceHouses: 0,
  totalMembers: 0,
  totalBilled: 0,
  totalCollected: 0,
  pendingAmount: 0,
  collectionRate: 0,
  totalExpenses: 0,
  netBalance: 0,
  totalVehicles: 0,
  twoWheelers: 0,
  fourWheelers: 0,
};

export default function Dashboard() {
  const { user, isAuthenticated, isDemo } = useAuth();

  const hasToken = isAuthenticated && !isDemo;

  const { data: metrics, isLoading: metricsLoading, isError: metricsError } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getMetrics,
    enabled: hasToken,
  });

  const { data: maintenanceRecords = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: maintenanceApi.getAll,
    enabled: hasToken,
  });

  const { data: expenditures = [] } = useQuery<Expenditure[]>({
    queryKey: ["expenditures"],
    queryFn: expendituresApi.getAll,
    enabled: hasToken,
  });

  // Use fetched metrics, or defaults for demo / error / loading states
  const safeMetrics: DashboardMetrics = metrics ?? DEFAULT_METRICS;

  if (metricsLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
        </div>
      </AdminLayout>
    );
  }

  const statCards = [
    {
      label: "Total Houses",
      value: safeMetrics.totalHouses,
      icon: Building2,
      change: "+2 this month",
      trend: "up",
    },
    {
      label: "Total Members",
      value: safeMetrics.totalMembers,
      icon: Users,
      change: "+5 this month",
      trend: "up",
    },
    {
      label: "Vacant Houses",
      value: safeMetrics.vacantHouses,
      icon: Building2,
      change: "−1 from last month",
      trend: "down",
    },
    {
      label: "Collection Rate",
      value: `${safeMetrics.collectionRate}%`,
      icon: TrendingUp,
      change: "+3% from last month",
      trend: "up",
    },
  ];

  const recentPayments = maintenanceRecords
    .filter((r) => r.status === "Paid")
    .slice(0, 5);

  const recentExpenses = expenditures.slice(0, 5);

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome section */}
        <div className="animate-fade-up">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
            Welcome back, {user?.name.split(" ")[0]}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening with your society today.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, index) => (
            <div
              key={stat.label}
              className="stat-card animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl lg:text-3xl font-bold text-foreground mt-1">
                    {stat.value}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-steel-blue/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-steel-blue" />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-4 text-sm">
                {stat.trend === "up" ? (
                  <ArrowUpRight className="w-4 h-4 text-steel-blue" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
                )}
                <span className={stat.trend === "up" ? "text-steel-blue" : "text-muted-foreground"}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Financial overview */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Maintenance summary */}
          <div className="glass-card p-6 animate-fade-up delay-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Maintenance Summary</h2>
              <Wallet className="w-5 h-5 text-steel-blue" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Billed</span>
                <span className="text-xl font-semibold text-foreground">
                  ₹{(safeMetrics.totalBilled ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Collected</span>
                <span className="text-xl font-semibold text-steel-blue">
                  ₹{(safeMetrics.totalCollected ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pending</span>
                <span className="text-xl font-semibold text-amber-500">
                  ₹{(safeMetrics.pendingAmount ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Collection Rate</span>
                  <span className="text-lg font-semibold text-foreground">{safeMetrics.collectionRate ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-steel-blue rounded-full transition-all duration-500"
                    style={{ width: `${safeMetrics.collectionRate ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expenditure snapshot */}
          <div className="glass-card p-6 animate-fade-up delay-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Expenditure Snapshot</h2>
              <TrendingDown className="w-5 h-5 text-steel-blue" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Expenses</span>
                <span className="text-xl font-semibold text-foreground">
                  ₹{(safeMetrics.totalExpenses ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Net Balance</span>
                <span className={`text-xl font-semibold ${(safeMetrics.netBalance ?? 0) >= 0 ? "text-steel-blue" : "text-destructive"}`}>
                  ₹{(safeMetrics.netBalance ?? 0).toLocaleString()}
                </span>
              </div>
              <div className="pt-4 border-t border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-muted-foreground">Vehicles</span>
                  <span className="font-semibold text-foreground">{safeMetrics.totalVehicles ?? 0}</span>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Two Wheeler: {safeMetrics.twoWheelers ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Four Wheeler: {safeMetrics.fourWheelers ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Activity logs */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent payments */}
          <div className="glass-card p-6 animate-fade-up delay-400">
            <h2 className="text-lg font-semibold text-foreground mb-6">Recent Payments</h2>
            <div className="space-y-4">
              {recentPayments.map((payment) => (
                <div key={payment.id} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-steel-blue" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {payment.houseNumber} - {payment.ownerName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ₹{payment.amountPaid.toLocaleString()} via {payment.paymentMethod}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{payment.paymentDate}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent expenses */}
          <div className="glass-card p-6 animate-fade-up delay-500">
            <h2 className="text-lg font-semibold text-foreground mb-6">Recent Expenses</h2>
            <div className="space-y-4">
              {recentExpenses.map((expense) => (
                <div key={expense.id} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{expense.title}</div>
                    <div className="text-xs text-muted-foreground">{expense.category}</div>
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    ₹{expense.amount.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
