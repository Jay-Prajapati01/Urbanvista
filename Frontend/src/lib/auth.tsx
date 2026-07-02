import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { authApi } from "./api";

type User = {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  mustResetPassword?: boolean;
  role: "admin" | "secretary" | "demo";
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isDemo: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  loginAsDemo: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: User = {
  id: "demo-001",
  name: "Demo Admin",
  email: "demo@urbanvista.com",
  role: "demo",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearStorage = () => {
    localStorage.removeItem("urbanvista-user");
    localStorage.removeItem("urbanvista-token");
    localStorage.removeItem("urbanvista-refresh-token");
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem("urbanvista-user");
      const pathname = window.location.pathname;
      const isStaffPath = pathname.startsWith("/admin") || pathname.startsWith("/secretary");

      const parsed = storedUser ? JSON.parse(storedUser) : null;
      if (parsed?.role === "demo") {
        setUser(parsed);
        setIsLoading(false);
        return;
      }

      if (!isStaffPath && !storedUser && !localStorage.getItem("urbanvista-token")) {
        setIsLoading(false);
        return;
      }

      try {
        const { valid, user: verifiedUser } = await authApi.verify();
        if (valid && verifiedUser) {
          const principal: User = {
            id: verifiedUser.id,
            name: verifiedUser.name,
            email: verifiedUser.email,
            username: verifiedUser.username || null,
            mustResetPassword: Boolean(verifiedUser.mustResetPassword),
            role: verifiedUser.role === "secretary" ? "secretary" : "admin",
          };
          setUser(principal);
          localStorage.setItem("urbanvista-user", JSON.stringify(principal));
        } else {
          clearStorage();
        }
      } catch {
        clearStorage();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { user: loggedInUser } = await authApi.login(email, password);

      const appUser: User = {
        id: loggedInUser.id,
        name: loggedInUser.name,
        email: loggedInUser.email,
        username: loggedInUser.username || null,
        mustResetPassword: Boolean(loggedInUser.mustResetPassword),
        role: loggedInUser.role === "secretary" ? "secretary" : "admin",
      };

      localStorage.setItem("urbanvista-user", JSON.stringify(appUser));
      setUser(appUser);

      toast.success(`Welcome back, ${appUser.role === "secretary" ? "Secretary" : "Admin"}!`);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Login failed";
      toast.error(message);
      return false;
    }
  };

  const loginAsDemo = () => {
    setUser(DEMO_USER);
    localStorage.setItem("urbanvista-user", JSON.stringify(DEMO_USER));
    localStorage.removeItem("urbanvista-token");
    localStorage.removeItem("urbanvista-refresh-token");
    toast.info("Demo mode – changes are disabled", {
      description: "You're viewing the app in read-only mode",
    });
  };

  const logout = () => {
    authApi.logout().catch(() => {});

    setUser(null);
    clearStorage();
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isDemo: user?.role === "demo",
        isLoading,
        login,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
