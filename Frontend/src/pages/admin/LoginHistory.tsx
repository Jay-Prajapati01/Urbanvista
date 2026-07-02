import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { activityApi, LoginHistory } from "@/lib/activityApi";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  LogIn,
  LogOut,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Monitor,
  Smartphone,
  RefreshCw,
  Loader2,
  Filter,
  Activity,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const STATUS_COLORS = {
  success: { bg: "bg-green-500/10", text: "text-green-500", border: "border-green-500/20" },
  failed: { bg: "bg-red-500/10", text: "text-red-500", border: "border-red-500/20" },
  blocked: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20" },
};

const STATUS_ICONS = {
  success: CheckCircle,
  failed: XCircle,
  blocked: AlertCircle,
};

const DEVICE_ICONS = {
  desktop: Monitor,
  mobile: Smartphone,
  unknown: Monitor,
};

function getDeviceType(userAgent?: string | null): "desktop" | "mobile" | "unknown" {
  if (!userAgent || typeof userAgent !== "string") return "unknown";
  const mobileKeywords = ["mobile", "android", "iphone", "ipad", "tablet"];
  const lowerUA = userAgent.toLowerCase();
  if (mobileKeywords.some((kw) => lowerUA.includes(kw))) return "mobile";
  return "desktop";
}

export default function LoginHistory() {
  const { isAuthenticated, isDemo } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [daysFilter, setDaysFilter] = useState<string>("7");

  const { data: historyData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["login-history", roleFilter, statusFilter, daysFilter],
    queryFn: () =>
      activityApi.getLoginHistory({
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        days: parseInt(daysFilter),
      }),
    enabled: isAuthenticated && !isDemo,
  });

  const { data: statsData } = useQuery({
    queryKey: ["login-stats", roleFilter, daysFilter],
    queryFn: () =>
      activityApi.getLoginStats({
        days: parseInt(daysFilter),
        role: roleFilter !== "all" ? roleFilter : undefined,
      }),
    enabled: isAuthenticated && !isDemo,
  });

  const { data: activeSessions } = useQuery({
    queryKey: ["active-sessions", roleFilter],
    queryFn: () =>
      activityApi.getActiveSessions({
        role: roleFilter !== "all" ? roleFilter : undefined,
        days: parseInt(daysFilter),
      }),
    enabled: isAuthenticated && !isDemo,
  });

  const history = historyData?.history || [];
  const activeCount = activeSessions?.length || 0;

  const pieData = [
    { name: "Success", value: statsData?.successful || 0, fill: "#10b981" },
    { name: "Failed", value: statsData?.failed || 0, fill: "#ef4444" },
    { name: "Blocked", value: statsData?.blocked || 0, fill: "#f59e0b" },
  ];

  const dailyData = statsData?.byDay
    ? Object.entries(statsData.byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date: format(new Date(date), "MMM d"),
          count,
        }))
    : [];

  const byUserData = statsData?.byUser
    ? Object.entries(statsData.byUser)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([user, count]) => ({
          user: user.length > 20 ? user.substring(0, 20) + "..." : user,
          count,
        }))
    : [];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading login history...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Login History</h1>
            <p className="text-muted-foreground mt-1">
              Track all login/logout activity and session management
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="secretary">Secretary</SelectItem>
                <SelectItem value="resident">Resident</SelectItem>
              </SelectContent>
            </Select>
            <Select value={daysFilter} onValueChange={setDaysFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsData?.total || 0}</div>
              <p className="text-xs text-muted-foreground">Last {daysFilter} days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Successful</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{statsData?.successful || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{statsData?.failed || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{activeCount}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Login Status Distribution</CardTitle>
              <CardDescription>
                {roleFilter === "all" ? "All roles" : `${roleFilter[0].toUpperCase()}${roleFilter.slice(1)} role`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.fill }}
                    />
                    <span className="text-xs">
                      {item.name}: {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Logins by Day</CardTitle>
              <CardDescription>Filtered by selected role and time range</CardDescription>
            </CardHeader>
            <CardContent>
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Users by Activity</CardTitle>
              <CardDescription>Filtered by selected role</CardDescription>
            </CardHeader>
            <CardContent>
              {byUserData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={byUserData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="user" type="category" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Login History</CardTitle>
                <CardDescription>Complete record of all login attempts across roles</CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Login Time</TableHead>
                    <TableHead>Logout Time</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => {
                    const statusStyle = STATUS_COLORS[record.status] || STATUS_COLORS.failed;
                    const StatusIcon = STATUS_ICONS[record.status] || AlertCircle;
                    const deviceType = getDeviceType(record.userAgent || "");
                    const DeviceIcon = DEVICE_ICONS[deviceType];

                    const loginTime = new Date(record.loginTime);
                    const logoutTime = record.logoutTime ? new Date(record.logoutTime) : null;
                    const duration = logoutTime
                      ? formatDistanceToNow(loginTime)
                      : record.status === "success"
                      ? "Active"
                      : "-";

                    return (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{record.userName || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{record.userEmail}</span>
                            <Badge variant="outline" className="text-xs mt-1 w-fit">
                              {record.userRole}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${statusStyle.bg} ${statusStyle.text}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {record.status}
                          </div>
                          {record.failureReason && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {record.failureReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <DeviceIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm capitalize">{deviceType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {record.ipAddress || "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div>{format(loginTime, "MMM d, yyyy")}</div>
                          <div className="text-muted-foreground">{format(loginTime, "HH:mm:ss")}</div>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {logoutTime ? (
                            <>
                              <div>{format(logoutTime, "MMM d, yyyy")}</div>
                              <div className="text-muted-foreground">
                                {format(logoutTime, "HH:mm:ss")}
                              </div>
                            </>
                          ) : record.status === "success" ? (
                            <Badge variant="outline" className="text-green-500 border-green-500">
                              Active
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {record.status === "success" ? (
                            <span
                              className={
                                !logoutTime ? "text-green-500 font-medium" : "text-muted-foreground"
                              }
                            >
                              {duration}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <LogIn className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No login history found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
