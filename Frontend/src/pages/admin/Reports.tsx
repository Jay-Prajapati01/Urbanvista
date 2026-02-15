import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { dashboardApi, housesApi, membersApi, vehiclesApi, maintenanceApi, expendituresApi } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/api";
import type { House, Member, Vehicle, MaintenanceRecord, Expenditure } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Home,
  Users,
  Wallet,
  Car,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";

export default function Reports() {
  const { isAuthenticated, isDemo } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);

  const hasToken = isAuthenticated && !isDemo;

  const { data: metrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getMetrics,
    enabled: hasToken,
  });

  // Fetch all section data so CSVs use the same synced data as main pages
  const { data: houses = [] } = useQuery<House[]>({
    queryKey: ["houses"],
    queryFn: housesApi.getAll,
    enabled: hasToken,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["members"],
    queryFn: membersApi.getAll,
    enabled: hasToken,
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: vehiclesApi.getAll,
    enabled: hasToken,
  });

  const { data: maintenance = [] } = useQuery<MaintenanceRecord[]>({
    queryKey: ["maintenance"],
    queryFn: maintenanceApi.getAll,
    enabled: hasToken,
  });

  const { data: expenditures = [] } = useQuery<Expenditure[]>({
    queryKey: ["expenditures"],
    queryFn: expendituresApi.getAll,
    enabled: hasToken,
  });

  const reports = [
    {
      id: "houses",
      title: "Houses Report",
      description: "Complete list of all houses with occupancy status",
      icon: Home,
      records: houses.length,
    },
    {
      id: "members",
      title: "Members Report",
      description: "All registered members with contact details",
      icon: Users,
      records: members.length,
    },
    {
      id: "maintenance",
      title: "Maintenance Report",
      description: "Monthly maintenance billing and payment status",
      icon: Wallet,
      records: maintenance.length,
    },
    {
      id: "vehicles",
      title: "Vehicles Report",
      description: "Complete vehicle registry by house",
      icon: Car,
      records: vehicles.length,
    },
  ];

  const prebuiltReports = [
    {
      id: "housewise-maintenance",
      title: "Housewise Maintenance Status",
      description: "Maintenance collection status grouped by house",
      status: "ready",
    },
    {
      id: "late-payments",
      title: "Late Payment List",
      description: "Houses with overdue maintenance payments",
      status: "ready",
    },
    {
      id: "vacant-properties",
      title: "Vacant Properties",
      description: "List of all vacant houses",
      status: "ready",
    },
  ];

  // ── Data Export CSV handlers ──
  const exportHouses = () => {
    exportToCsv("houses_report", houses as unknown as Record<string, unknown>[], [
      { header: "House Number", key: "houseNumber" },
      { header: "Block", key: "block" },
      { header: "Floor", key: "floor" },
      { header: "Status", key: "status" },
      { header: "Members Count", key: "membersCount" },
      { header: "Vehicles Count", key: "vehiclesCount" },
      { header: "Notes", key: "notes" },
    ]);
  };

  const exportMembers = () => {
    exportToCsv("members_report", members as unknown as Record<string, unknown>[], [
      { header: "Name", key: "name" },
      { header: "House Number", key: "houseNumber" },
      { header: "Role", key: "role" },
      { header: "Phone", key: "phone" },
      { header: "Email", key: "email" },
      { header: "Active", key: "isActive", format: (v) => (v ? "Yes" : "No") },
    ]);
  };

  const exportMaintenance = () => {
    exportToCsv("maintenance_report", maintenance as unknown as Record<string, unknown>[], [
      { header: "House Number", key: "houseNumber" },
      { header: "Owner Name", key: "ownerName" },
      { header: "From Month", key: "fromMonth" },
      { header: "To Month", key: "toMonth" },
      { header: "Base Amount", key: "baseAmount" },
      { header: "Late Fee", key: "lateFee" },
      { header: "Extra Charges", key: "extraCharges" },
      { header: "Total Amount", key: "totalAmount" },
      { header: "Amount Paid", key: "amountPaid" },
      { header: "Balance", key: "totalAmount", format: (_v, row) => String((Number(row.totalAmount) || 0) - (Number(row.amountPaid) || 0)) },
      { header: "Payment Method", key: "paymentMethod" },
      { header: "Status", key: "status" },
    ]);
  };

  const exportVehicles = () => {
    exportToCsv("vehicles_report", vehicles as unknown as Record<string, unknown>[], [
      { header: "Vehicle Number", key: "vehicleNumber" },
      { header: "Type", key: "type" },
      { header: "Color", key: "color" },
      { header: "Owner Name", key: "ownerName" },
      { header: "House Number", key: "houseNumber" },
    ]);
  };

  // ── Pre-built Report generators ──
  const generateHousewiseMaintenance = () => {
    // Build one row per house showing totals
    const houseMap: Record<string, { houseNumber: string; ownerName: string; totalBilled: number; totalPaid: number; balance: number; paidCount: number; pendingCount: number; overdueCount: number }> = {};
    maintenance.forEach((r) => {
      if (!houseMap[r.houseNumber]) {
        houseMap[r.houseNumber] = { houseNumber: r.houseNumber, ownerName: r.ownerName, totalBilled: 0, totalPaid: 0, balance: 0, paidCount: 0, pendingCount: 0, overdueCount: 0 };
      }
      const h = houseMap[r.houseNumber];
      h.totalBilled += r.totalAmount || 0;
      h.totalPaid += r.amountPaid || 0;
      h.balance += (r.totalAmount || 0) - (r.amountPaid || 0);
      if (r.status === "Paid") h.paidCount++;
      else if (r.status === "Pending") h.pendingCount++;
      else if (r.status === "Overdue") h.overdueCount++;
    });
    const rows = Object.values(houseMap).sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
    exportToCsv("housewise_maintenance_status", rows as unknown as Record<string, unknown>[], [
      { header: "House Number", key: "houseNumber" },
      { header: "Owner Name", key: "ownerName" },
      { header: "Total Billed (₹)", key: "totalBilled" },
      { header: "Total Paid (₹)", key: "totalPaid" },
      { header: "Balance (₹)", key: "balance" },
      { header: "Paid Records", key: "paidCount" },
      { header: "Pending Records", key: "pendingCount" },
      { header: "Overdue Records", key: "overdueCount" },
    ]);
  };

  const generateLatePayments = () => {
    const lateRecords = maintenance.filter((r) => r.status === "Overdue" || r.status === "Pending");
    if (lateRecords.length === 0) {
      toast.info("No overdue or pending payments found");
      return;
    }
    exportToCsv("late_payments_report", lateRecords as unknown as Record<string, unknown>[], [
      { header: "House Number", key: "houseNumber" },
      { header: "Owner Name", key: "ownerName" },
      { header: "From Month", key: "fromMonth" },
      { header: "To Month", key: "toMonth" },
      { header: "Total Amount (₹)", key: "totalAmount" },
      { header: "Amount Paid (₹)", key: "amountPaid" },
      { header: "Balance Due (₹)", key: "totalAmount", format: (_v, row) => String((Number(row.totalAmount) || 0) - (Number(row.amountPaid) || 0)) },
      { header: "Status", key: "status" },
      { header: "Payment Method", key: "paymentMethod" },
    ]);
  };

  const generateVacantProperties = () => {
    const vacant = houses.filter((h) => h.status === "vacant");
    if (vacant.length === 0) {
      toast.info("No vacant properties found");
      return;
    }
    exportToCsv("vacant_properties_report", vacant as unknown as Record<string, unknown>[], [
      { header: "House Number", key: "houseNumber" },
      { header: "Block", key: "block" },
      { header: "Floor", key: "floor" },
      { header: "Status", key: "status" },
      { header: "Notes", key: "notes" },
    ]);
  };

  // ── Dispatch handler ──
  const handleExport = (reportId: string) => {
    setExporting(reportId);
    try {
      switch (reportId) {
        case "houses":
          exportHouses();
          break;
        case "members":
          exportMembers();
          break;
        case "maintenance":
          exportMaintenance();
          break;
        case "vehicles":
          exportVehicles();
          break;
        case "housewise-maintenance":
          generateHousewiseMaintenance();
          break;
        case "late-payments":
          generateLatePayments();
          break;
        case "vacant-properties":
          generateVacantProperties();
          break;
        default:
          toast.error("Unknown report");
      }
      toast.success(`${reportId.replace(/-/g, " ")} report exported`);
    } catch {
      toast.error("Failed to export report");
    } finally {
      setExporting(null);
    }
  };

  const isLoading = metricsLoading;

  if (isLoading && hasToken) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Generate and export society reports</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-100">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.collectionRate ?? 0}%</p>
              </div>
              <CheckCircle className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-2xl font-bold text-amber-500">₹{(metrics?.pendingAmount ?? 0).toLocaleString()}</p>
              </div>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Vacant Houses</p>
                <p className="text-2xl font-bold text-foreground">{metrics?.vacantHouses ?? 0}</p>
              </div>
              <Home className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Balance</p>
                <p className={`text-2xl font-bold ${(metrics?.netBalance ?? 0) >= 0 ? "text-steel-blue" : "text-destructive"}`}>
                  ₹{(metrics?.netBalance ?? 0).toLocaleString()}
                </p>
              </div>
              <BarChart3 className="w-5 h-5 text-steel-blue" />
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="animate-fade-up delay-200">
          <h2 className="text-lg font-semibold text-foreground mb-4">Data Export</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {reports.map((report) => (
              <div key={report.id} className="glass-card p-6 hover-lift">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-lg bg-steel-blue/10 flex items-center justify-center">
                    <report.icon className="w-5 h-5 text-steel-blue" />
                  </div>
                  <span className="text-xs text-muted-foreground">{report.records} records</span>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{report.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={exporting === report.id}
                  onClick={() => handleExport(report.id)}
                >
                  {exporting === report.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  Export CSV
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Pre-built Reports */}
        <div className="animate-fade-up delay-300">
          <h2 className="text-lg font-semibold text-foreground mb-4">Pre-built Reports</h2>
          <div className="glass-card overflow-hidden">
            <div className="divide-y divide-border">
              {prebuiltReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 text-steel-blue" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{report.title}</h3>
                      <p className="text-sm text-muted-foreground">{report.description}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" disabled={exporting === report.id} onClick={() => handleExport(report.id)}>
                    {exporting === report.id ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Generate
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Analytics placeholder */}
        <div className="animate-fade-up delay-400">
          <h2 className="text-lg font-semibold text-foreground mb-4">Analytics</h2>
          <div className="glass-card p-12 text-center">
            <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">Analytics Coming Soon</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Visual charts and graphs for maintenance collection trends, expenditure breakdown, 
              and occupancy analytics will be available here.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
