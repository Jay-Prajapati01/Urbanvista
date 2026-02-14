import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 via-background to-secondary/30" />
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-steel-blue/5 rounded-full blur-3xl" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8 animate-fade-up">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Ready to modernize your{" "}
            <span className="gradient-text-accent">society management?</span>
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of societies already using UrbanVista to streamline their 
            operations and improve resident satisfaction.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/admin/dashboard">
              <Button variant="hero" size="xl" className="group">
                Get Started Today
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button
              variant="heroOutline"
              size="xl"
              onClick={() => toast.success("Demo request submitted! We'll contact you soon.")}
            >
              <Calendar className="w-5 h-5" />
              Schedule Demo
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            No credit card required • Free 14-day trial • Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}
