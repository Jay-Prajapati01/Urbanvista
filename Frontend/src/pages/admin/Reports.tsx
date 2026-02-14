import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { dashboardApi } from "@/lib/api";
import type { DashboardMetrics } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
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

  const hasToken = isAuthenticated && !isDemo;

  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.getMetrics,
    enabled: hasToken,
  });

  const reports = [
    {
      id: "houses",
      title: "Houses Report",
      description: "Complete list of all houses with occupancy status",
      icon: Home,
      records: metrics?.totalHouses ?? 0,
    },
    {
      id: "members",
      title: "Members Report",
      description: "All registered members with contact details",
      icon: Users,
      records: metrics?.totalMembers ?? 0,
    },
    {
      id: "maintenance",
      title: "Maintenance Report",
      description: "Monthly maintenance billing and payment status",
      icon: Wallet,
      records: (metrics?.totalHouses ?? 0),
    },
    {
      id: "vehicles",
      title: "Vehicles Report",
      description: "Complete vehicle registry by house",
      icon: Car,
      records: metrics?.totalVehicles ?? 0,
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

  const handleExport = (reportId: string) => {
    toast.success(`Exporting ${reportId} report...`);
  };

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
                  onClick={() => handleExport(report.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
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
                  <Button variant="outline" size="sm" onClick={() => handleExport(report.id)}>
                    <Download className="w-4 h-4 mr-2" />
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
