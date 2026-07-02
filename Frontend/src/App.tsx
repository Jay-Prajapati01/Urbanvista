import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ErrorBoundary from "./components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/lib/theme";
import { AuthProvider } from "@/lib/auth";
import { UserAuthProvider } from "@/lib/userAuth";
import { Loader2 } from "lucide-react";

const Index = lazy(() => import("./pages/Index"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Houses = lazy(() => import("./pages/admin/Houses"));
const Members = lazy(() => import("./pages/admin/Members"));
const Vehicles = lazy(() => import("./pages/admin/Vehicles"));
const Maintenance = lazy(() => import("./pages/admin/Maintenance"));
const Expenditures = lazy(() => import("./pages/admin/Expenditures"));
const Secretaries = lazy(() => import("./pages/admin/Secretaries"));
const Settings = lazy(() => import("./pages/admin/Settings"));
const Notifications = lazy(() => import("./pages/admin/Notifications"));
const ActivityLogs = lazy(() => import("./pages/admin/ActivityLogs"));
const LoginHistory = lazy(() => import("./pages/admin/LoginHistory"));
const SecretaryDashboard = lazy(() => import("./pages/secretary/SecretaryDashboard"));
const SecretarySettings = lazy(() => import("./pages/secretary/SecretarySettings"));
const SecretaryHouses = lazy(() => import("./pages/secretary/SecretaryHouses"));
const SecretaryMembers = lazy(() => import("./pages/secretary/SecretaryMembers"));
const SecretaryVehicles = lazy(() => import("./pages/secretary/SecretaryVehicles"));
const SecretaryMaintenance = lazy(() => import("./pages/secretary/SecretaryMaintenance"));
const SecretaryExpenditures = lazy(() => import("./pages/secretary/SecretaryExpenditures"));
const SecretaryResidents = lazy(() => import("./pages/secretary/SecretaryResidents"));
const SecretaryReports = lazy(() => import("./pages/secretary/SecretaryReports"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const UserSignup = lazy(() => import("./pages/UserSignup"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const UserPayments = lazy(() => import("./pages/user/UserPayments"));
const UserReceipts = lazy(() => import("./pages/user/UserReceipts"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 401 Unauthorized
        if (error instanceof Error && error.message.includes("401")) return false;
        return failureCount < 2;
      },
      staleTime: 30000,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <UserAuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
            <Suspense
              fallback={
                <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
                  <Loader2 className="mr-3 h-8 w-8 animate-spin text-steel-blue" />
                  Loading UrbanVista...
                </div>
              }
            >
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  {/* Admin Routes */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin/dashboard" element={<Dashboard />} />
                  <Route path="/admin/houses" element={<Houses />} />
                  <Route path="/admin/members" element={<Members />} />
                  <Route path="/admin/vehicles" element={<Vehicles />} />
                  <Route path="/admin/maintenance" element={<Maintenance />} />
                  <Route path="/admin/expenditures" element={<Expenditures />} />
                  <Route path="/admin/secretaries" element={<Secretaries />} />
                  <Route path="/admin/settings" element={<Settings />} />
                  <Route path="/admin/notifications" element={<Notifications />} />
                  <Route path="/admin/activity-logs" element={<ActivityLogs />} />
                  <Route path="/admin/login-history" element={<LoginHistory />} />
                  {/* Secretary Routes */}
                  <Route path="/secretary/login" element={<AdminLogin />} />
                  <Route path="/secretary/dashboard" element={<SecretaryDashboard />} />
                  <Route path="/secretary/houses" element={<SecretaryHouses />} />
                  <Route path="/secretary/members" element={<SecretaryMembers />} />
                  <Route path="/secretary/vehicles" element={<SecretaryVehicles />} />
                  <Route path="/secretary/maintenance" element={<SecretaryMaintenance />} />
                  <Route path="/secretary/expenditures" element={<SecretaryExpenditures />} />
                  <Route path="/secretary/residents" element={<SecretaryResidents />} />
                  <Route path="/secretary/reports" element={<SecretaryReports />} />
                  <Route path="/secretary/settings" element={<SecretarySettings />} />
                  {/* User Routes */}
                  <Route path="/login" element={<UserLogin />} />
                  <Route path="/signup" element={<UserSignup />} />
                  <Route path="/user/dashboard" element={<UserDashboard />} />
                  <Route path="/user/payments" element={<UserPayments />} />
                  <Route path="/user/receipts" element={<UserReceipts />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </Suspense>
            </ErrorBoundary>
          </TooltipProvider>
        </UserAuthProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
