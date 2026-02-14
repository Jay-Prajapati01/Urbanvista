import AdminLayout from "@/components/admin/AdminLayout";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor, Check } from "lucide-react";

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const themes = [
    {
      id: "light" as const,
      title: "Light",
      description: "Classic light theme",
      icon: Sun,
    },
    {
      id: "dark" as const,
      title: "Dark",
      description: "Easy on the eyes",
      icon: Moon,
    },
    {
      id: "system" as const,
      title: "System",
      description: "Follow system preference",
      icon: Monitor,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8 max-w-2xl">
        {/* Header */}
        <div className="animate-fade-up">
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your application preferences</p>
        </div>

        {/* Appearance */}
        <div className="glass-card p-6 animate-fade-up delay-100">
          <h2 className="text-lg font-semibold text-foreground mb-2">Appearance</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Customize how UrbanVista looks on your device
          </p>

          <div className="grid gap-4">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 text-left ${
                  theme === t.id
                    ? "border-steel-blue bg-steel-blue/5"
                    : "border-border hover:border-muted-foreground/50 hover:bg-secondary/50"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    theme === t.id ? "bg-steel-blue/10" : "bg-secondary"
                  }`}
                >
                  <t.icon
                    className={`w-5 h-5 ${
                      theme === t.id ? "text-steel-blue" : "text-muted-foreground"
                    }`}
                  />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-foreground">{t.title}</div>
                  <div className="text-sm text-muted-foreground">{t.description}</div>
                </div>
                {theme === t.id && (
                  <div className="w-6 h-6 rounded-full bg-steel-blue flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="glass-card p-6 animate-fade-up delay-200">
          <h2 className="text-lg font-semibold text-foreground mb-2">About UrbanVista</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Enterprise-grade society management platform
          </p>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Version</span>
              <span className="text-foreground font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Build</span>
              <span className="text-foreground font-medium">2024.12.30</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Support</span>
              <span className="text-steel-blue font-medium">support@urbanvista.com</span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
