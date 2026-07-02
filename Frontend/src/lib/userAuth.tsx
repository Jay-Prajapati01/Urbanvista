import { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { userAuthApi } from "./userApi";

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  houseId: string | null;
  memberId: string | null;
  role: "user";
};

type UserAuthContextType = {
  user: UserAccount | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isGoogleOAuthConfigured: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  loginWithGoogle: () => void;
  logout: () => void;
};

const UserAuthContext = createContext<UserAuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function getFriendlyAuthError(err: unknown) {
  const message = err instanceof Error ? err.message : "Authentication failed";
  if (message.includes("Resident auth tables are not initialized")) {
    return "Resident signup/login is not set up in Supabase yet. Run Backend/database/fix_user_auth_tables.sql, then try again.";
  }
  return message;
}

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGoogleOAuthConfigured, setIsGoogleOAuthConfigured] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const userParam = params.get("user");

    if (token && userParam) {
      try {
        const parsed = JSON.parse(userParam) as UserAccount;
        // Token is delivered via query param for OAuth callback, but we
        // do NOT persist it to localStorage. Backend sets a secure httpOnly
        // cookie for authentication; only store non-sensitive user account.
        localStorage.setItem("urbanvista-user-account", JSON.stringify(parsed));
        setUser(parsed);
        window.history.replaceState({}, "", window.location.pathname);
        setIsLoading(false);
        return;
      } catch {
        // Fall through to normal verification.
      }
    }

    const pathname = window.location.pathname;
    const hasCachedResidentUser = Boolean(localStorage.getItem("urbanvista-user-account"));
    const isResidentPath = pathname === "/login" || pathname === "/signup" || pathname.startsWith("/user/");
    const shouldVerifyResidentSession = hasCachedResidentUser || isResidentPath;

    userAuthApi
      .googleStatus()
      .then(({ configured }) => setIsGoogleOAuthConfigured(Boolean(configured)))
      .catch(() => setIsGoogleOAuthConfigured(false));

    // Check for Google OAuth callback params in URL
    const queryParams = new URLSearchParams(window.location.search);
    const hasAuthParams = queryParams.has("error");
    if (hasAuthParams) {
      window.history.replaceState({}, "", window.location.pathname);
    }

    if (!shouldVerifyResidentSession) {
      setIsLoading(false);
      return;
    }

    userAuthApi
      .verify()
      .then(({ valid, user: verifiedUser }) => {
        if (valid && verifiedUser) {
          const principal = verifiedUser as UserAccount;
          setUser(principal);
          localStorage.setItem("urbanvista-user-account", JSON.stringify(principal));
        } else {
          localStorage.removeItem("urbanvista-user-account");
        }
      })
      .catch(() => {
        localStorage.removeItem("urbanvista-user-account");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { user: loggedInUser } = await userAuthApi.login(email, password);
      // backend sets authentication cookie (httpOnly); do not store token in localStorage
      const appUser: UserAccount = {
        id: loggedInUser.id,
        name: loggedInUser.name,
        email: loggedInUser.email,
        houseId: loggedInUser.houseId,
        memberId: loggedInUser.memberId,
        role: "user",
      };
      localStorage.setItem("urbanvista-user-account", JSON.stringify(appUser));
      setUser(appUser);
      toast.success(`Welcome back, ${loggedInUser.name}!`);
      return true;
    } catch (err: unknown) {
      toast.error(getFriendlyAuthError(err));
      return false;
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const { user: newUser } = await userAuthApi.signup(name, email, password);
      // backend sets authentication cookie (httpOnly); do not store token in localStorage
      const appUser: UserAccount = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        houseId: newUser.houseId,
        memberId: newUser.memberId,
        role: "user",
      };
      localStorage.setItem("urbanvista-user-account", JSON.stringify(appUser));
      setUser(appUser);
      toast.success("Account created successfully!");
      return true;
    } catch (err: unknown) {
      toast.error(getFriendlyAuthError(err));
      return false;
    }
  };

  const loginWithGoogle = () => {
    if (!isGoogleOAuthConfigured) {
      toast.error("Google sign-in is not configured. Use email and password.");
      return;
    }
    window.location.href = `${API_BASE}/user-auth/google`;
  };

  const logout = () => {
    userAuthApi.logout().catch(() => {});
    setUser(null);
    localStorage.removeItem("urbanvista-user-account");
    toast.success("Logged out successfully");
  };

  return (
    <UserAuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isGoogleOAuthConfigured,
        login,
        signup,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}

export const useUserAuth = () => {
  const context = useContext(UserAuthContext);
  if (context === undefined) {
    throw new Error("useUserAuth must be used within a UserAuthProvider");
  }
  return context;
};
