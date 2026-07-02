import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { activityApi, DashboardSummary } from "@/lib/activityApi";
import { secretariesApi } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import {
  Activity,
  Users,
  LogIn,
  LogOut,
  CreditCard,
  Building2,
  TrendingUp,
  TrendingDown,
  Bell,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  UserCheck,
  UserX,
  Car,
  FileText,
  Receipt,
  Settings,
  Trash2,
  Plus,
  Pencil,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const ACTION_ICONS: Record<string, typeof LogIn> = {
  "login_success": LogIn,
  "login_failed": LogOut,
  "logout": LogOut,
  "member.create": Plus,
  "member.update": Pencil,
  "member.delete": Trash2,
  "house.create": Building2,
  "house.update": Pencil,
  "house.delete": Trash2,
  "vehicle.create": Car,
  "vehicle.update": Pencil,
  "vehicle.delete": Trash2,
  "maintenance.create": Receipt,
  "maintenance.update": Pencil,
  "maintenance.delete": Trash2,
  "expenditure.create": FileText,
  "expenditure.update": Pencil,
  "expenditure.delete": Trash2,
  "payment.success": CreditCard,
  "payment.failed": AlertCircle,
  "secretary.create": UserCheck,
  "secretary.update": Pencil,
  "secretary.disable": UserX,
  "secretary.enable": UserCheck,
  "secretary.reset_password": Settings,
};

const ACTION_COLORS: Record<string, string> = {
  "login_success": "text-green-500 bg-green-500/10",
  "login_failed": "text-red-500 bg-red-500/10",
  "logout": "text-gray-500 bg-gray-500/10",
  "member.create": "text-blue-500 bg-blue-500/10",
  "member.update": "text-amber-500 bg-amber-500/10",
  "member.delete": "text-red-500 bg-red-500/10",
  "payment.success": "text-green-500 bg-green-500/10",
  "payment.failed": "text-red-500 bg-red-500/10",
};

export default function AdminDashboard() {
  const { user, isAuthenticated, isDemo } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());
  const [selectedLog, setSelectedLog] = useState<DashboardSummary["activity"]["recent"][number] | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: secretaries = [] } = useQuery({
    queryKey: ["secretaries"],
    queryFn: () => secretariesApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const fetchDashboard = useCallback(async () => {
    if (!isAuthenticated || isDemo) return;
    
    try {
      setIsLoading(true);
      const data = await activityApi.getDashboardSummary();
      setDashboardData(data);
      setLastCheck(new Date().toISOString());
    } catch (error) {
      console.error("Failed to fetch dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isDemo]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (isAuthenticated && !isDemo) {
      const interval = setInterval(fetchDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isDemo, fetchDashboard]);

  if (isLoading && !dashboardData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading dashboard...</span>
        </div>
      </AdminLayout>
    );
  }

  const activityChartData = dashboardData?.activity?.byType
    ? Object.entries(dashboardData.activity.byType).map(([name, value]) => ({
        name: name.replace(/\./g, " ").replace(/_/g, " "),
        value,
      }))
    : [];

  const loginChartData = [
    { name: "Success", value: dashboardData?.logins?.success || 0, fill: "#10b981" },
    { name: "Failed", value: dashboardData?.logins?.failed || 0, fill: "#ef4444" },
    { name: "Blocked", value: dashboardData?.logins?.blocked || 0, fill: "#f59e0b" },
  ];

  const paymentChartData = [
    { name: "Successful", value: dashboardData?.payments?.successful || 0, fill: "#10b981" },
    { name: "Pending", value: dashboardData?.payments?.pending || 0, fill: "#f59e0b" },
    { name: "Failed", value: dashboardData?.payments?.failed || 0, fill: "#ef4444" },
  ];

  const secretaryChartData = dashboardData?.secretaries
    ? Object.entries(dashboardData.secretaries).map(([id, data]) => ({
        name: secretaries.find((s) => s.id === id)?.name || "Unknown",
        logins: data.logins,
        actions: data.actions,
        payments: data.payments,
        amount: data.amount,
      }))
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Track all activity across Resident and Secretary panels
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="w-3 h-3 mr-1" />
              Last updated: {formatDistanceToNow(new Date(lastCheck), { addSuffix: true })}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchDashboard} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity Logs</TabsTrigger>
            <TabsTrigger value="logins">Login History</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="secretaries">Secretary Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardData?.activity?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Login Success</CardTitle>
                  <LogIn className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {dashboardData?.logins?.success || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData?.logins?.failed || 0} failed attempts
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payments Collected</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ₹{(dashboardData?.payments?.total || 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardData?.payments?.successful || 0} successful transactions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unread Notifications</CardTitle>
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">
                    {dashboardData?.notifications?.unread || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Alerts pending review</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Activity by Type</CardTitle>
                  <CardDescription>Distribution of all CRUD operations</CardDescription>
                </CardHeader>
                <CardContent>
                  {activityChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={activityChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No activity data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Login & Payment Status</CardTitle>
                  <CardDescription>Overview of logins and transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Login Status</h4>
                      <ResponsiveContainer width="100%" height={130}>
                        <PieChart>
                          <Pie
                            data={loginChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {loginChartData.map((entry, index) => (
                              <Cell key={`login-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">Payment Status</h4>
                      <ResponsiveContainer width="100%" height={130}>
                        <PieChart>
                          <Pie
                            data={paymentChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={30}
                            outerRadius={50}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {paymentChartData.map((entry, index) => (
                              <Cell key={`payment-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-xs">Success</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-xs">Pending/Failed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest actions from all users</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {dashboardData?.activity?.recent?.slice(0, 10).map((log) => {
                      const Icon = ACTION_ICONS[log.action] || Activity;
                      const colorClass = ACTION_COLORS[log.action] || "text-gray-500 bg-gray-500/10";
                      
                      return (
                        <div
                          key={log.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedLog(log)}
                        >
                          <div className={`p-2 rounded-lg ${colorClass}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{log.userName || "System"}</span>
                              <Badge variant="outline" className="text-xs">
                                {log.userRole}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {log.description || log.action}
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </div>
                        </div>
                      );
                    })}
                    {(!dashboardData?.activity?.recent || dashboardData.activity.recent.length === 0) && (
                      <div className="text-center py-8 text-muted-foreground">
                        No recent activity
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>All Activity Logs</CardTitle>
                <CardDescription>Complete history of all CRUD operations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Resource</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData?.activity?.recent?.map((log) => {
                        const Icon = ACTION_ICONS[log.action] || Activity;
                        const colorClass = ACTION_COLORS[log.action] || "text-gray-500 bg-gray-500/10";
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{log.userName || "System"}</span>
                                <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${colorClass}`}>
                                <Icon className="w-3 h-3" />
                                {log.action}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{log.resourceType || "-"}</TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {log.description || "-"}
                            </TableCell>
                            <TableCell className="text-xs">{log.ipAddress || "-"}</TableCell>
                            <TableCell className="text-xs">
                              {format(new Date(log.createdAt), "MMM d, HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {(!dashboardData?.activity?.recent || dashboardData.activity.recent.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No activity logs available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logins" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful Logins</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {dashboardData?.logins?.success || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {dashboardData?.logins?.failed || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Blocked</CardTitle>
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">
                    {dashboardData?.logins?.blocked || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Secretary Login Summary</CardTitle>
                <CardDescription>Login activity per secretary</CardDescription>
              </CardHeader>
              <CardContent>
                {secretaryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={secretaryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="logins" fill="#10b981" name="Logins" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No login data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    ₹{(dashboardData?.payments?.total || 0).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Successful</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {dashboardData?.payments?.successful || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-500">
                    {dashboardData?.payments?.pending || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  <XCircle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">
                    {dashboardData?.payments?.failed || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payments per Secretary</CardTitle>
                <CardDescription>Collection breakdown by secretary</CardDescription>
              </CardHeader>
              <CardContent>
                {secretaryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={secretaryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                      <Bar dataKey="amount" fill="#3b82f6" name="Amount (₹)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No payment data available
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="secretaries" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Secretary Activity Overview</CardTitle>
                <CardDescription>Track all actions performed by secretaries</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Secretary</TableHead>
                        <TableHead>Logins</TableHead>
                        <TableHead>CRUD Actions</TableHead>
                        <TableHead>Payments Collected</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {secretaries.map((sec) => {
                        const stats = dashboardData?.secretaries?.[sec.id] || {};
                        
                        return (
                          <TableRow key={sec.id}>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{sec.name}</span>
                                <span className="text-xs text-muted-foreground">{sec.email}</span>
                              </div>
                            </TableCell>
                            <TableCell>{stats.logins || 0}</TableCell>
                            <TableCell>{stats.actions || 0}</TableCell>
                            <TableCell>{stats.payments || 0}</TableCell>
                            <TableCell className="font-medium">
                              ₹{(stats.amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={sec.status === "active" ? "default" : "secondary"}>
                                {sec.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {secretaries.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No secretaries found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>

            {secretaryChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Secretary Activity Comparison</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={secretaryChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="actions" fill="#8b5cf6" name="Actions" />
                      <Bar yAxisId="right" dataKey="payments" fill="#10b981" name="Payments" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activity Details</DialogTitle>
              <DialogDescription>Complete information about this activity</DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">User</p>
                    <p className="font-medium">{selectedLog.userName || "System"}</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.userEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Action</p>
                    <Badge variant="outline">{selectedLog.action}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Resource</p>
                    <p>{selectedLog.resourceType || "-"}</p>
                    <p className="text-xs text-muted-foreground">ID: {selectedLog.resourceId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Timestamp</p>
                    <p>{format(new Date(selectedLog.createdAt), "PPpp")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p>{selectedLog.ipAddress || "-"}</p>
                  </div>
                </div>
                {selectedLog.description && (
                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p>{selectedLog.description}</p>
                  </div>
                )}
                {selectedLog.oldValue && (
                  <div>
                    <p className="text-sm text-muted-foreground">Old Value</p>
                    <pre className="p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(selectedLog.oldValue, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.newValue && (
                  <div>
                    <p className="text-sm text-muted-foreground">New Value</p>
                    <pre className="p-2 bg-muted rounded text-xs overflow-auto">
                      {JSON.stringify(selectedLog.newValue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
