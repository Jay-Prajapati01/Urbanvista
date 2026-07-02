import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserAuth } from "@/lib/userAuth";
import { Building2, Lock, Mail, Eye, EyeOff, ArrowRight, Home, Wallet, FileText } from "lucide-react";

export default function UserLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginWithGoogle, isAuthenticated, isGoogleOAuthConfigured } = useUserAuth();
  const navigate = useNavigate();

  // Handle Google OAuth callback params
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/user/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // Check for error from Google callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    if (error) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      navigate("/user/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Benefits */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary/50 via-background to-secondary/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-steel-blue/5 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center p-12 lg:p-20">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-xl bg-steel-blue/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-steel-blue" />
            </div>
            <span className="text-2xl font-bold text-foreground">UrbanVista</span>
          </Link>

          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            Your Society,
            <br />
            <span className="gradient-text-accent">Your Dashboard</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-12 max-w-md">
            Access your home details, make maintenance payments, and download receipts — all in one place.
          </p>

          <div className="space-y-6">
            {[
              { icon: Home, title: "Home & Family Info", desc: "View your house and family details" },
              { icon: Wallet, title: "Online Payments", desc: "Pay maintenance fees securely via Razorpay" },
              { icon: FileText, title: "Digital Receipts", desc: "Download payment receipts as PDF" },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-10 h-10 rounded-lg bg-steel-blue/10 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-steel-blue" />
                </div>
                <div>
                  <div className="font-medium text-foreground">{item.title}</div>
                  <div className="text-sm text-muted-foreground">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-fade-up">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-steel-blue/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-steel-blue" />
              </div>
              <span className="text-xl font-bold text-foreground">UrbanVista</span>
            </Link>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-center lg:text-left">
              <h2 className="text-2xl font-bold text-foreground">Resident Sign In</h2>
              <p className="text-muted-foreground mt-2">Access your society dashboard</p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/">
                <Home className="w-4 h-4" />
                Home
              </Link>
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-secondary/50 border-border focus:border-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-secondary/50 border-border focus:border-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
              <ArrowRight className="w-5 h-5" />
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            variant="heroOutline"
            size="lg"
            className="w-full"
            onClick={loginWithGoogle}
            disabled={!isGoogleOAuthConfigured}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isGoogleOAuthConfigured ? "Continue with Google" : "Google Sign-In Unavailable"}
          </Button>

          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-steel-blue hover:underline font-medium">
                Sign Up
              </Link>
            </p>
            <p className="text-sm text-muted-foreground">
              <Link to="/admin/login" className="text-muted-foreground hover:text-foreground hover:underline">
                Admin? Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
