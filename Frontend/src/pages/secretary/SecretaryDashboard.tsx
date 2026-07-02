import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useAuth } from "@/lib/auth";
import {
  useSecretaryDashboard,
  useSecretaryScope,
  useSecretaryHouses,
  useSecretaryMaintenance,
  useSecretaryExpenditures,
  useSecretaryVehicles,
  useSecretaryResidents,
} from "@/hooks/useSecretaryQueries";
import type { House, MaintenanceRecord, Expenditure } from "@/lib/data";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  Building2,
  Wallet,
  ClipboardList,
  AlertTriangle,
  Loader2,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Car,
  Wrench,
  Receipt,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
} from "lucide-react";

export default function SecretaryDashboard() {
  const { user, isAuthenticated, isDemo } = useAuth();
  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  // Core queries
  const { data: metrics, isLoading: metricsLoading } = useSecretaryDashboard(hasToken);
  const { data: scope, isLoading: scopeLoading } = useSecretaryScope(hasToken);
  const { data: houses = [], isLoading: housesLoading } = useSecretaryHouses(undefined, hasToken);
  const { data: maintenance = [], isLoading: maintenanceLoading } = useSecretaryMaintenance(
    undefined,
    hasToken
  );
  const { data: expenditures = [], isLoading: expendituresLoading } = useSecretaryExpenditures(
    undefined,
    hasToken
  );
  const { data: vehicles = [] } = useSecretaryVehicles(undefined, hasToken);
  const { data: residents = [] } = useSecretaryResidents(undefined, hasToken);

  const isLoading = metricsLoading || scopeLoading || housesLoading || maintenanceLoading || expendituresLoading;

  if (isLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading secretary workspace...</span>
        </div>
      </SecretaryLayout>
    );
  }

  // Computed values
  const safeMetrics = metrics || {
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
  };

  const unpaidMaintenance = maintenance.filter((m) => m.status !== "Paid" && m.status !== "paid").length;
  const overdueMaintenanceCount = maintenance.filter((m) => {
    const dueDate = m.dueDate ? new Date(m.dueDate) : null;
    return dueDate && dueDate < new Date() && (m.status === "Pending" || m.status === "pending");
  }).length;
  const vacantHouses = houses.filter((h) => h.status === "vacant").length;
  const occupiedHouses = houses.filter((h) => h.status === "occupied").length;

  return (
    <SecretaryLayout>
      <ErrorBoundary>
        <div className="space-y-6">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-3xl font-bold text-foreground">Secretary Command Center</h1>
          <p className="text-muted-foreground mt-1">
            Operational overview of your assigned blocks and daily tasks
          </p>
        </div>

        {/* Current Scope Section */}
        <div className="glass-card p-6 animate-fade-up delay-100">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Your Operational Scope
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-2xl font-bold text-foreground">{scope?.blocks?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Assigned Blocks</div>
              {scope?.blocks && scope.blocks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {scope.blocks.map((b) => (
                    <Badge key={b} variant="secondary" className="text-xs">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{scope?.houseIds?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total Flats Accessible</div>
              <div className="text-xs text-muted-foreground mt-2">
                {occupiedHouses} occupied, {vacantHouses} vacant
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">{residents.length}</div>
              <div className="text-sm text-muted-foreground">Active Residents</div>
              <div className="text-xs text-muted-foreground mt-2">
                {vehicles.length} vehicles registered
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-fade-up delay-150">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            <Link to="/secretary/houses">
              <Button
                variant="outline"
                className="w-full flex flex-col items-center gap-2 h-auto py-3"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Add House</span>
              </Button>
            </Link>
            <Link to="/secretary/residents">
              <Button
                variant="outline"
                className="w-full flex flex-col items-center gap-2 h-auto py-3"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Add Resident</span>
              </Button>
            </Link>
            <Link to="/secretary/maintenance">
              <Button
                variant="outline"
                className="w-full flex flex-col items-center gap-2 h-auto py-3"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Generate Maintenance</span>
              </Button>
            </Link>
            <Link to="/secretary/expenditures">
              <Button
                variant="outline"
                className="w-full flex flex-col items-center gap-2 h-auto py-3"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Add Expense</span>
              </Button>
            </Link>
            <Link to="/secretary/vehicles">
              <Button
                variant="outline"
                className="w-full flex flex-col items-center gap-2 h-auto py-3"
              >
                <Plus className="w-4 h-4" />
                <span className="text-xs">Register Vehicle</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up delay-200">
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Flats</p>
                <p className="text-3xl font-bold text-foreground mt-2">{houses.length}</p>
              </div>
              <Home className="w-8 h-8 text-steel-blue opacity-20" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-3xl font-bold text-amber-500 mt-2">{unpaidMaintenance}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-amber-500 opacity-20" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collection Rate</p>
                <p className="text-3xl font-bold text-green-500 mt-2">{safeMetrics.collectionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Amount</p>
                <p className="text-3xl font-bold text-foreground mt-2">
                  ₹{(safeMetrics.pendingAmount || 0).toLocaleString()}
                </p>
              </div>
              <Wallet className="w-8 h-8 text-steel-blue opacity-20" />
            </div>
          </div>
        </div>

        {/* Pending Tasks & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up delay-250">
          {/* Pending Tasks */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              Pending Tasks
            </h2>
            <div className="space-y-3">
              {overdueMaintenanceCount > 0 && (
                <Link to="/secretary/maintenance">
                  <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                        <span className="text-sm font-medium text-foreground">
                          {overdueMaintenanceCount} Overdue Maintenance Records
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
                  </div>
                </Link>
              )}

              {unpaidMaintenance > 0 && (
                <Link to="/secretary/maintenance">
                  <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-foreground">
                          ₹{(safeMetrics.pendingAmount || 0).toLocaleString()} Pending Collection
                        </span>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-amber-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">From {unpaidMaintenance} records</p>
                  </div>
                </Link>
              )}

              {vacantHouses > 0 && (
                <Link to="/secretary/houses">
                  <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 hover:bg-blue-500/10 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Home className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-foreground">{vacantHouses} Vacant Flats</span>
                      </div>
                      <ArrowDownRight className="w-4 h-4 text-blue-500" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Ready for new residents</p>
                  </div>
                </Link>
              )}

              {unpaidMaintenance === 0 && vacantHouses === 0 && overdueMaintenanceCount === 0 && (
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-foreground">All systems operational</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">No pending tasks detected</p>
                </div>
              )}
            </div>
          </div>

          {/* Financial Snapshot */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-steel-blue" />
              Financial Snapshot
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-muted-foreground">Total Billed</span>
                <span className="font-semibold text-foreground">₹{(safeMetrics.totalBilled || 0).toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-muted-foreground">Total Collected</span>
                <span className="font-semibold text-green-500">₹{(safeMetrics.totalCollected || 0).toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between p-2">
                <span className="text-sm text-muted-foreground">Total Expenses</span>
                <span className="font-semibold text-orange-500">₹{(safeMetrics.totalExpenses || 0).toLocaleString()}</span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex items-center justify-between p-2 bg-steel-blue/5 rounded-lg px-3 py-2">
                <span className="text-sm font-semibold text-foreground">Net Balance</span>
                <span className="font-bold text-lg text-steel-blue">₹{(safeMetrics.netBalance || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Occupancy & Vehicle Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up delay-300">
          {/* Occupancy Overview */}
          <Link to="/secretary/houses">
            <div className="glass-card p-6 hover-lift cursor-pointer h-full">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-steel-blue" />
                Occupancy Overview
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/10">
                  <div className="text-2xl font-bold text-green-500">{occupiedHouses}</div>
                  <div className="text-xs text-muted-foreground mt-1">Occupied</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-500/5 border border-gray-500/10">
                  <div className="text-2xl font-bold text-gray-500">{vacantHouses}</div>
                  <div className="text-xs text-muted-foreground mt-1">Vacant</div>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                  <div className="text-2xl font-bold text-orange-500">{safeMetrics.maintenanceHouses || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Under Maintenance</div>
                </div>
              </div>
            </div>
          </Link>

          {/* Vehicle Registry */}
          <Link to="/secretary/vehicles">
            <div className="glass-card p-6 hover-lift cursor-pointer h-full">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-steel-blue" />
                Vehicle Registry
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-steel-blue/5 border border-steel-blue/10">
                  <div className="text-2xl font-bold text-steel-blue">{safeMetrics.twoWheelers || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Two Wheelers</div>
                </div>
                <div className="p-3 rounded-lg bg-steel-blue/5 border border-steel-blue/10">
                  <div className="text-2xl font-bold text-steel-blue">{safeMetrics.fourWheelers || 0}</div>
                  <div className="text-xs text-muted-foreground mt-1">Four Wheelers</div>
                </div>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">
                Total: {safeMetrics.totalVehicles || 0} vehicles
              </div>
            </div>
          </Link>
        </div>

        {/* Main Operations Hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-up delay-400">
          <Link to="/secretary/houses">
            <div className="glass-card p-6 hover-lift">
              <Home className="w-6 h-6 text-steel-blue mb-3" />
              <h3 className="font-semibold text-foreground">House Management</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Manage flats, occupancy status, and property metadata
              </p>
            </div>
          </Link>

          <Link to="/secretary/residents">
            <div className="glass-card p-6 hover-lift">
              <Users className="w-6 h-6 text-steel-blue mb-3" />
              <h3 className="font-semibold text-foreground">Resident Management</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Add residents, create credentials, and manage profiles
              </p>
            </div>
          </Link>

          <Link to="/secretary/maintenance">
            <div className="glass-card p-6 hover-lift">
              <Wrench className="w-6 h-6 text-steel-blue mb-3" />
              <h3 className="font-semibold text-foreground">Maintenance & Billing</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Generate maintenance records and track payments
              </p>
            </div>
          </Link>

          <Link to="/secretary/expenditures">
            <div className="glass-card p-6 hover-lift">
              <Receipt className="w-6 h-6 text-steel-blue mb-3" />
              <h3 className="font-semibold text-foreground">Expense Tracking</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Record and categorize operational expenses
              </p>
            </div>
          </Link>

          <Link to="/secretary/vehicles">
            <div className="glass-card p-6 hover-lift">
              <Car className="w-6 h-6 text-steel-blue mb-3" />
              <h3 className="font-semibold text-foreground">Vehicle Registry</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Register and manage resident vehicles
              </p>
            </div>
          </Link>

          <Link to="/secretary/reports">
            <div className="glass-card p-6 hover-lift">
              <BarChart3 className="w-6 h-6 text-steel-blue mb-3" />
              <h3 className="font-semibold text-foreground">Reports & Analytics</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Generate scoped reports and analytics
              </p>
            </div>
          </Link>
        </div>
        </div>
      </ErrorBoundary>
    </SecretaryLayout>
  );
}
