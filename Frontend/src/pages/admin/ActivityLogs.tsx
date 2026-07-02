import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { activityApi, ActivityLog } from "@/lib/activityApi";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table as TableIcon,
  Search,
  Filter,
  Download,
  Eye,
  Activity,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  UserPlus,
  UserCheck,
  UserX,
  Car,
  Receipt,
  Building2,
  CreditCard,
  FileText,
  Settings,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ACTION_ICONS: Record<string, typeof LogIn> = {
  "login_success": LogIn,
  "login_failed": LogOut,
  "logout": LogOut,
  "member.create": UserPlus,
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
  "payment.failed": Settings,
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
  "secretary.create": "text-green-500 bg-green-500/10",
  "secretary.disable": "text-red-500 bg-red-500/10",
  "secretary.enable": "text-green-500 bg-green-500/10",
};

const ACTION_CATEGORIES = [
  { value: "all", label: "All Actions" },
  { value: "auth.login_success", label: "Login Success" },
  { value: "auth.login_failed", label: "Login Failed" },
  { value: "member.", label: "Member Operations" },
  { value: "house.", label: "House Operations" },
  { value: "vehicle.", label: "Vehicle Operations" },
  { value: "maintenance.", label: "Maintenance Operations" },
  { value: "payment.", label: "Payment Operations" },
  { value: "secretary.", label: "Secretary Operations" },
];

const RESOURCE_TYPES = [
  { value: "all", label: "All Resources" },
  { value: "admin_user", label: "Admin User" },
  { value: "house", label: "House" },
  { value: "member", label: "Member" },
  { value: "vehicle", label: "Vehicle" },
  { value: "maintenance_record", label: "Maintenance" },
  { value: "expenditure", label: "Expenditure" },
  { value: "payment", label: "Payment" },
];

export default function ActivityLogs() {
  const { isAuthenticated, isDemo } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const limit = 20;

  const { data: logsData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["activity-logs", page, actionFilter, resourceFilter, searchQuery],
    queryFn: async () => {
      const params: NonNullable<Parameters<typeof activityApi.getLogs>[0]> = {
        page,
        limit,
        search: searchQuery || undefined,
      };

      if (actionFilter !== "all") {
        if (actionFilter.includes(".")) {
          params.action = actionFilter;
        }
      }

      if (resourceFilter !== "all") {
        params.resourceType = resourceFilter;
      }

      return activityApi.getLogs(params);
    },
    enabled: isAuthenticated && !isDemo,
  });

  const { data: statsData } = useQuery({
    queryKey: ["activity-log-stats"],
    queryFn: () => activityApi.getLogStats(7),
    enabled: isAuthenticated && !isDemo,
  });

  const logs = logsData?.logs || [];
  const totalPages = logsData?.totalPages || 1;
  const totalLogs = logsData?.total || 0;

  const handleExport = () => {
    window.open(`${API_BASE}/activity/logs/export`, "_blank");
  };

  if (isLoading && !logsData) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading activity logs...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Activity Logs</h1>
            <p className="text-muted-foreground mt-1">
              Complete audit trail of all system actions
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {statsData?.byAction &&
            Object.entries(statsData.byAction).map(([action, count]) => {
              const Icon = ACTION_ICONS[action] || Activity;
              const colorClass = ACTION_COLORS[action] || "text-gray-500 bg-gray-500/10";

              return (
                <Card key={action}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[100px]">
                          {action.replace(/\./g, " ").replace(/_/g, " ")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={resourceFilter} onValueChange={(v) => { setResourceFilter(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Resource Type" />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((res) => (
                    <SelectItem key={res.value} value={res.value}>
                      {res.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Audit Trail</CardTitle>
                <CardDescription>
                  Showing {logs.length} of {totalLogs} logs
                </CardDescription>
              </div>
            </div>
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
                    <TableHead className="text-right">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const Icon = ACTION_ICONS[log.action] || Activity;
                    const colorClass = ACTION_COLORS[log.action] || "text-gray-500 bg-gray-500/10";

                    return (
                      <TableRow key={log.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{log.userName || "System"}</span>
                            <span className="text-xs text-muted-foreground">{log.userEmail}</span>
                            <Badge variant="outline" className="text-xs mt-1 w-fit">
                              {log.userRole}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${colorClass}`}>
                            <Icon className="w-3 h-3" />
                            <span className="truncate max-w-[120px]">
                              {log.action.replace(/\./g, " ").replace(/_/g, " ")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.resourceType || "-"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {log.description || "-"}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {log.ipAddress || "-"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div>{format(new Date(log.createdAt), "MMM d, yyyy")}</div>
                          <div className="text-muted-foreground">
                            {format(new Date(log.createdAt), "HH:mm:ss")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No activity logs found</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Activity Log Details</DialogTitle>
              <DialogDescription>
                Complete information about this activity
              </DialogDescription>
            </DialogHeader>
            {selectedLog && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">User</Label>
                    <p className="font-medium">{selectedLog.userName || "System"}</p>
                    <p className="text-sm text-muted-foreground">{selectedLog.userEmail}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <Badge variant="outline">{selectedLog.userRole}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Action</Label>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs mt-1 ${ACTION_COLORS[selectedLog.action] || "text-gray-500 bg-gray-500/10"}`}>
                      {selectedLog.action}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Resource</Label>
                    <p>{selectedLog.resourceType || "-"}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {selectedLog.resourceId || "-"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">IP Address</Label>
                    <p className="font-mono text-sm">{selectedLog.ipAddress || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Timestamp</Label>
                    <p className="text-sm">
                      {format(new Date(selectedLog.createdAt), "PPpp")}
                    </p>
                  </div>
                </div>

                {selectedLog.description && (
                  <div>
                    <Label className="text-muted-foreground">Description</Label>
                    <p className="text-sm mt-1">{selectedLog.description}</p>
                  </div>
                )}

                {selectedLog.userAgent && (
                  <div>
                    <Label className="text-muted-foreground">User Agent</Label>
                    <p className="text-xs mt-1 break-all">{selectedLog.userAgent}</p>
                  </div>
                )}

                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedLog.oldValue && (
                      <div>
                        <Label className="text-muted-foreground">Old Value</Label>
                        <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40 mt-1">
                          {JSON.stringify(selectedLog.oldValue, null, 2)}
                        </pre>
                      </div>
                    )}
                    {selectedLog.newValue && (
                      <div>
                        <Label className="text-muted-foreground">New Value</Label>
                        <pre className="p-2 bg-muted rounded text-xs overflow-auto max-h-40 mt-1">
                          {JSON.stringify(selectedLog.newValue, null, 2)}
                        </pre>
                      </div>
                    )}
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
