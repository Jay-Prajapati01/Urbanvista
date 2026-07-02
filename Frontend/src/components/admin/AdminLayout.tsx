import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { activityApi } from "@/lib/activityApi";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  LayoutDashboard,
  Home,
  Users,
  Car,
  Wrench,
  Receipt,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Moon,
  Sun,
  Monitor,
  AlertCircle,
  Shield,
  Bell,
  Activity,
  LogIn,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const adminNavItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "activity-logs", label: "Activity Logs", icon: Activity },
  { key: "login-history", label: "Login History", icon: LogIn },
  { key: "houses", label: "Houses", icon: Home },
  { key: "members", label: "Members", icon: Users },
  { key: "vehicles", label: "Vehicles", icon: Car },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "expenditures", label: "Expenditures", icon: Receipt },
  { key: "secretaries", label: "Secretaries", icon: Shield },
  { key: "notifications", label: "Notifications", icon: Bell, badge: true },
  { key: "settings", label: "Settings", icon: Settings },
];

const secretaryNavItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "houses", label: "Houses", icon: Home },
  { key: "members", label: "Members", icon: Users },
  { key: "vehicles", label: "Vehicles", icon: Car },
  { key: "maintenance", label: "Maintenance", icon: Wrench },
  { key: "expenditures", label: "Expenditures", icon: Receipt },
  { key: "residents", label: "Residents", icon: Users },
  { key: "reports", label: "Reports", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAuthenticated, isDemo, isLoading, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const basePath = user?.role === "secretary" ? "/secretary" : "/admin";

  const { data: notificationsData } = useQuery({
    queryKey: ["notifications-badge"],
    queryFn: () => activityApi.getNotifications({ page: 1, limit: 1 }),
    enabled: isAuthenticated && !isDemo && user?.role === "admin",
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(basePath === "/secretary" ? "/secretary/login" : "/admin/login");
    }
  }, [isAuthenticated, isLoading, navigate, basePath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-steel-blue/30 border-t-steel-blue rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navItems = user?.role === "admin" ? adminNavItems : secretaryNavItems;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link to={`${basePath}/dashboard`} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-steel-blue/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-steel-blue" />
              </div>
              <div>
                <div className="font-semibold text-foreground">UrbanVista</div>
                <div className="text-[11px] text-muted-foreground leading-tight">
                  {user?.role === "secretary" ? "Secretary Workspace" : "Admin Workspace"}
                </div>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Demo mode banner */}
          {isDemo && (
            <div className="mx-4 mt-4 p-3 rounded-lg bg-steel-blue/10 border border-steel-blue/20">
              <div className="flex items-center gap-2 text-sm text-steel-blue">
                <AlertCircle className="w-4 h-4" />
                <span className="font-medium">Demo Mode</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Read-only access
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const path = `${basePath}/${item.key}`;
              const isActive = location.pathname === path;
              const showBadge = item.badge && unreadCount > 0;
              return (
                <Link
                  key={item.key}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-link ${isActive ? "nav-link-active" : ""}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {showBadge && (
                    <Badge
                      variant="destructive"
                      className="ml-auto min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-steel-blue/10 flex items-center justify-center">
                <span className="text-sm font-medium text-steel-blue">
                  {user?.name.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user?.name}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
                {user?.role === "secretary" && (
                  <div className="text-[11px] text-steel-blue mt-1">Scoped Access</div>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 lg:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {resolvedTheme === "dark" ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="w-4 h-4 mr-2" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="w-4 h-4 mr-2" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  <Monitor className="w-4 h-4 mr-2" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
