import { Button } from "@/components/ui/button";
import { Building2, Shield, Star, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export function Hero() {
  const { loginAsDemo } = useAuth();
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    loginAsDemo();
    navigate("/admin/dashboard");
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      
      {/* Ambient glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-steel-blue/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-steel-blue/5 rounded-full blur-3xl" />

      <div className="container relative z-10 mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left content */}
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground">
              <Building2 className="w-4 h-4 text-steel-blue" />
              <span>Enterprise Society Management</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight">
              <span className="gradient-text">Modern Society</span>
              <br />
              <span className="text-foreground">Management</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
              UrbanVista empowers admins and residents alike — manage houses, members,
              vehicles, maintenance, and make online payments with instant PDF receipts.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button variant="hero" size="xl">
                  Resident Sign Up
                </Button>
              </Link>
              <Button
                variant="heroOutline"
                size="xl"
                onClick={handleDemoLogin}
              >
                View Demo
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-8 pt-8 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-steel-blue" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">500+</span> Societies
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-steel-blue fill-steel-blue" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">4.5★</span> Rating
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-steel-blue" />
                <span className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">24/7</span> Support
                </span>
              </div>
            </div>
          </div>

          {/* Right visual - Dashboard mockup */}
          <div className="relative animate-fade-up delay-200">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-steel-blue/20 rounded-2xl blur-3xl scale-110" />
              
              {/* Main dashboard card */}
              <div className="relative glass-card p-6 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-steel-blue/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-steel-blue" />
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">UrbanVista</div>
                      <div className="text-xs text-muted-foreground">Admin Panel</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                    <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
                    <div className="w-3 h-3 rounded-full bg-steel-blue" />
                  </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Total Houses", value: "120" },
                    { label: "Members", value: "342" },
                    { label: "Collection Rate", value: "94%" },
                    { label: "Net Balance", value: "₹2.4L" },
                  ].map((stat, i) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-lg bg-secondary/50 border border-border/50"
                      style={{ animationDelay: `${i * 100 + 400}ms` }}
                    >
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                      <div className="text-xl font-bold text-foreground">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Activity list */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Activity
                  </div>
                  {[
                    "Payment received from A-101",
                    "New member added to B-202",
                    "Expense recorded: ₹5,000",
                  ].map((activity, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-2 rounded-md bg-background/50"
                    >
                      <div className="w-2 h-2 rounded-full bg-steel-blue" />
                      <span className="text-sm text-muted-foreground">{activity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 glass-card p-3 animate-float">
                <div className="text-xs text-muted-foreground">Vehicles</div>
                <div className="text-2xl font-bold text-foreground">86</div>
                <div className="text-xs text-steel-blue">+12%</div>
              </div>

              <div className="absolute -bottom-6 -left-6 w-32 glass-card p-3 animate-float delay-300">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-steel-blue" />
                  <span className="text-xs text-muted-foreground">Secured</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
