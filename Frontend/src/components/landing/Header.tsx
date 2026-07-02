import { Button } from "@/components/ui/button";
import { Building2, Moon, Sun, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { useTheme } from "@/lib/theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-steel-blue/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-steel-blue" />
            </div>
            <span className="text-lg font-semibold text-foreground">UrbanVista</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
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

            <Link to="/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Resident Login
              </Button>
            </Link>
            <Link to="/secretary/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Secretary
              </Button>
            </Link>
            <Link to="/admin/login">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
                Admin
              </Button>
            </Link>
            <Link to="/signup">
              <Button variant="default">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
