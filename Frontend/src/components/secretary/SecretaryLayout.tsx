/**
 * Secretary Layout Component - Workflow-Oriented Workspace
 * Replaces the generic AdminLayout for secretary users.
 * Provides workflow-driven navigation structure.
 */

import { ReactNode, useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useSecretaryScope } from "@/hooks/useSecretaryQueries";
import { useQuery } from "@tanstack/react-query";
import { activityApi } from "@/lib/activityApi";
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
  Bell,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Secretary Navigation Structure - Workflow-Oriented Groups
 */
const secretaryNavStructure = [
  {
    label: "Workspace",
    items: [
      { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Operational overview" },
    ],
  },
  {
    label: "Management",
    items: [
      { key: "houses", label: "Houses", icon: Home, description: "Manage flats & properties" },
      { key: "residents", label: "Residents", icon: Users, description: "Manage residents & credentials" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "maintenance", label: "Maintenance", icon: Wrench, description: "Track billing & payments" },
      { key: "vehicles", label: "Vehicles", icon: Car, description: "Vehicle registry" },
    ],
  },
  {
    label: "Finance",
    items: [
      { key: "expenditures", label: "Expenses", icon: Receipt, description: "Track expenses" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { key: "reports", label: "Reports", icon: BarChart3, description: "Generate reports" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "settings", label: "Settings", icon: Settings, description: "Workspace settings" },
    ],
  },
];

interface SecretaryLayoutProps {
  children: ReactNode;
}

export default function SecretaryLayout({ children }: SecretaryLayoutProps) {
  const { user, isAuthenticated, isDemo, isLoading, logout } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const basePath = "/secretary";

  const { data: scope } = useSecretaryScope(isAuthenticated && !isDemo);

  const { data: notificationsData } = useQuery({
    queryKey: ["secretary-notifications"],
    queryFn: () => activityApi.getNotifications({ page: 1, limit: 1 }),
    enabled: isAuthenticated && !isDemo && user?.role === "secretary",
    refetchInterval: 30000,
  });

  const unreadCount = notificationsData?.unreadCount || 0;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/secretary/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Branding */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link to={`${basePath}/dashboard`} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-steel-blue/10 flex-shrink-0 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-steel-blue" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-foreground text-sm leading-tight">Secretary</div>
                <div className="text-[10px] text-muted-foreground leading-tight">Workspace</div>
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

          {/* Current Scope Badge */}
          {scope && (
            <div className="mx-4 mt-3 p-2.5 rounded-lg bg-steel-blue/5 border border-steel-blue/10">
              <div className="text-xs text-muted-foreground mb-1">Your Scope</div>
              {scope.blocks && scope.blocks.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {scope.blocks.map((block) => (
                    <Badge key={block} variant="secondary" className="text-xs">
                      Block {block}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">No blocks assigned</div>
              )}
              <div className="text-xs text-muted-foreground mt-1.5">
                {scope.houseIds?.length || 0} flats accessible
              </div>
            </div>
          )}

          {/* Navigation - Workflow Oriented */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {secretaryNavStructure.map((group) => (
              <div key={group.label}>
                <div className="px-3 mb-2.5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </div>
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const path = `${basePath}/${item.key}`;
                    const isActive = location.pathname === path;
                    return (
                      <Link
                        key={item.key}
                        to={path}
                        onClick={() => setSidebarOpen(false)}
                        className={`nav-link group ${isActive ? "nav-link-active" : ""}`}
                        title={item.description}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="block">{item.label}</span>
                          <span className="text-xs text-muted-foreground group-hover:text-muted-foreground/70 hidden sm:block">
                            {item.description}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-steel-blue/10 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-steel-blue">{user?.name.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              </div>
            </div>

            {/* Theme Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between mb-2">
                  <span className="text-xs">Theme</span>
                  {resolvedTheme === "dark" ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4" />
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

            {/* Logout Button */}
            <Button onClick={handleLogout} variant="destructive" size="sm" className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-40 h-16 bg-card border-b border-border flex items-center px-4 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1" />

          {/* Notifications */}
          {unreadCount > 0 && (
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            </Button>
          )}
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}
