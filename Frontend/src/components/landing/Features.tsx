import { Building2, Car, FileText, Users, Wallet, BarChart3, CreditCard, Download, Home } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Member Management",
    description: "Track all residents with roles, contact details, and activity status. Group members by house for easy management.",
  },
  {
    icon: Building2,
    title: "Property Records",
    description: "Maintain comprehensive records of all houses, blocks, and floors. Track occupancy and maintenance status.",
  },
  {
    icon: Car,
    title: "Vehicle Management",
    description: "Register and track vehicles by house. Monitor parking allocation and generate vehicle reports.",
  },
  {
    icon: CreditCard,
    title: "Online Payments",
    description: "Residents can pay maintenance fees online via Razorpay. Secure UPI, card, and net banking support.",
  },
  {
    icon: Home,
    title: "Resident Dashboard",
    description: "Individual resident portal with home info, family details, vehicle records, and payment history at a glance.",
  },
  {
    icon: Download,
    title: "PDF Receipts",
    description: "Automatic receipt generation after every payment. Residents can view and download receipts as PDF anytime.",
  },
  {
    icon: Wallet,
    title: "Financial Operations",
    description: "Handle maintenance billing, payments, and expenditure tracking. Generate receipts and financial reports.",
  },
  {
    icon: FileText,
    title: "Maintenance Tracking",
    description: "Monthly maintenance billing with late fees, partial payments, and automated status tracking.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Generate detailed reports and export data. Track collection rates and expenditure trends.",
  },
];

export function Features() {
  return (
    <section className="py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent" />
      
      <div className="container relative z-10 mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Everything you need</span> to manage your society
          </h2>
          <p className="text-lg text-muted-foreground">
            A comprehensive suite of tools designed for modern residential society management
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group glass-card p-6 hover-lift animate-fade-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-steel-blue/10 flex items-center justify-center mb-4 group-hover:bg-steel-blue/20 transition-colors duration-300">
                <feature.icon className="w-6 h-6 text-steel-blue" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground group-hover:text-steel-blue transition-colors duration-300">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
