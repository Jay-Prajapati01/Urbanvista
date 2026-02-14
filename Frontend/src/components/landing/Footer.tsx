import { Building2 } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-steel-blue/10 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-steel-blue" />
            </div>
            <span className="font-semibold text-foreground">UrbanVista</span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/admin/dashboard" className="hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link to="/admin/login" className="hover:text-foreground transition-colors">
              Login
            </Link>
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} UrbanVista. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
