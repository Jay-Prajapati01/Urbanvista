import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { authApi } from "@/lib/api";
import { Building2, Lock, Mail, Eye, EyeOff, ArrowRight, Shield, Users, BarChart3, House } from "lucide-react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSecretaryLogin = location.pathname.startsWith("/secretary");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const success = await login(email, password);
    setIsLoading(false);
    if (success) {
      let role: "admin" | "secretary" | "demo" | undefined;
      try {
        const verified = await authApi.verify();
        role = (verified.user?.role === "secretary" ? "secretary" : "admin") as
          | "admin"
          | "secretary"
          | "demo"
          | undefined;
      } catch {
        role = "admin";
      }

      navigate(role === "secretary" ? "/secretary/dashboard" : "/admin/dashboard");
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate("/admin/dashboard");
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
            Enterprise Society
            <br />
            <span className="gradient-text-accent">Management Platform</span>
          </h1>

          <p className="text-lg text-muted-foreground mb-12 max-w-md">
            Streamline your residential society operations with our comprehensive admin dashboard.
          </p>

          <div className="space-y-6">
            {[
              { icon: Users, title: "Complete Member Management", desc: "Track residents, owners, and tenants" },
              { icon: Shield, title: "Secure & Reliable", desc: "Enterprise-grade security for your data" },
              { icon: BarChart3, title: "Real-time Analytics", desc: "Financial reports and insights" },
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
              <h2 className="text-2xl font-bold text-foreground">Welcome back</h2>
              <p className="text-muted-foreground mt-2">
                Sign in to your {isSecretaryLogin ? "secretary" : "admin"} account
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link to="/">
                <House className="w-4 h-4" />
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
                  type="text"
                  placeholder={isSecretaryLogin ? "secretary username or email" : "admin@urbanvista.com"}
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
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

            {!isSecretaryLogin && (
              <Button
                variant="heroOutline"
                size="lg"
                className="w-full"
                onClick={handleDemoLogin}
              >
                <Building2 className="w-5 h-5" />
                View Demo
              </Button>
            )}

          {/* Demo credentials */}
          <div className="glass-card p-4 space-y-2 text-sm">
            <div className="font-medium text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-steel-blue" />
              Default Credentials
            </div>
            <div className="text-muted-foreground space-y-1">
              <div>Email: <code className="text-steel-blue">admin@urbanvista.com</code></div>
              <div>Password: <code className="text-steel-blue">admin123</code></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
