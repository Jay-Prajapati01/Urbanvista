import { useState, useEffect, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { activityApi, Notification } from "@/lib/activityApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Eye,
  Clock,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Info,
  CreditCard,
  LogIn,
  FileText,
  Settings,
  UserPlus,
  UserCheck,
  UserX,
  Car,
  Receipt,
  Building2,
  Plus,
  Pencil,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const TYPE_ICONS: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertCircle,
  error: AlertCircle,
  payment: CreditCard,
  login: LogIn,
  crud: FileText,
};

const TYPE_COLORS: Record<string, string> = {
  info: "text-blue-500 bg-blue-500/10",
  success: "text-green-500 bg-green-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  error: "text-red-500 bg-red-500/10",
  payment: "text-purple-500 bg-purple-500/10",
  login: "text-cyan-500 bg-cyan-500/10",
  crud: "text-orange-500 bg-orange-500/10",
};

export default function Notifications() {
  const { isAuthenticated, isDemo } = useAuth();
  const queryClient = useQueryClient();
  const [lastCheck, setLastCheck] = useState<string>(new Date().toISOString());
  const [isPolling, setIsPolling] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["notifications", filter],
    queryFn: async () => {
      const response = await activityApi.getNotifications({
        page: 1,
        limit: 100,
        unreadOnly: filter === "unread",
      });
      return response;
    },
    enabled: isAuthenticated && !isDemo,
    refetchInterval: false,
  });

  const {
    data: realtimeData,
    isLoading: isRealtimeLoading,
  } = useQuery({
    queryKey: ["realtime-notifications", lastCheck],
    queryFn: () => activityApi.getRealtimeNotifications(lastCheck),
    enabled: isAuthenticated && !isDemo,
    refetchInterval: 10000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => activityApi.markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification marked as read");
    },
    onError: () => {
      toast.error("Failed to mark notification as read");
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => activityApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("All notifications marked as read");
    },
    onError: () => {
      toast.error("Failed to mark all as read");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activityApi.deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notification deleted");
    },
    onError: () => {
      toast.error("Failed to delete notification");
    },
  });

  useEffect(() => {
    if (realtimeData?.count && realtimeData.count > 0) {
      setIsPolling(true);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setTimeout(() => setIsPolling(false), 1000);
    }
    if (realtimeData?.timestamp) {
      setLastCheck(realtimeData.timestamp);
    }
  }, [realtimeData, queryClient]);

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading notifications...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Real-time alerts and activity updates
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isPolling && (
              <Badge variant="outline" className="text-green-500 border-green-500">
                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                New
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={markAllReadMutation.isPending}
              >
                <CheckCheck className="w-4 h-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Bell className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{notificationsData?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{unreadCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto-refresh</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">10s</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All ({notificationsData?.total || 0})
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
          >
            Unread ({unreadCount})
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Notifications</CardTitle>
            <CardDescription>
              {filter === "unread" 
                ? "Showing only unread notifications" 
                : "Complete notification history"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = TYPE_ICONS[notification.type] || Bell;
                  const colorClass = TYPE_COLORS[notification.type] || "text-gray-500 bg-gray-500/10";

                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                        notification.isRead
                          ? "bg-muted/30 border-transparent"
                          : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-medium text-sm ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          {notification.readAt && (
                            <span className="text-xs text-muted-foreground">
                              Read: {format(new Date(notification.readAt), "MMM d, HH:mm")}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkRead(notification.id)}
                            disabled={markReadMutation.isPending}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(notification.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {notifications.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No notifications {filter === "unread" && "unread"}</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
