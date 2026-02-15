import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { authApi } from "./api";

type User = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "demo";
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

// Demo credentials (read-only mode)
const DEMO_USER: User = {
  id: "demo-001",
  name: "Demo Admin",
  email: "demo@urbanvista.com",
  role: "demo",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem("urbanvista-user");
    const token = localStorage.getItem("urbanvista-token");

    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      // For demo users, just restore without verification
      if (parsed.role === "demo") {
        setUser(parsed);
        setIsLoading(false);
        return;
      }
      // For real admin, verify the token is still valid
      if (token) {
        authApi
          .verify()
          .then(({ valid, user: verifiedUser }) => {
            if (valid && verifiedUser) {
              setUser(verifiedUser as User);
            } else {
              localStorage.removeItem("urbanvista-user");
              localStorage.removeItem("urbanvista-token");
            }
          })
          .catch(() => {
            localStorage.removeItem("urbanvista-user");
            localStorage.removeItem("urbanvista-token");
          })
          .finally(() => {
            setIsLoading(false);
          });
      } else {
        setUser(parsed);
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { token, user: loggedInUser } = await authApi.login(email, password);

      const appUser: User = {
        id: loggedInUser.id,
        name: loggedInUser.name,
        email: loggedInUser.email,
        role: "admin",
      };

      localStorage.setItem("urbanvista-token", token);
      localStorage.setItem("urbanvista-user", JSON.stringify(appUser));
      setUser(appUser);

      toast.success("Welcome back, Admin!");
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
    toast.info("Demo mode – changes are disabled", {
      description: "You're viewing the app in read-only mode",
    });
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("urbanvista-user");
    localStorage.removeItem("urbanvista-token");
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
