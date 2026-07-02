import { useState } from "react";
import SecretaryLayout from "@/components/secretary/SecretaryLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { dashboardApi, housesApi, membersApi, vehiclesApi, maintenanceApi, expendituresApi } from "@/lib/api";
import type { House, Member, Vehicle, MaintenanceRecord, Expenditure } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Home,
  Users,
  Wallet,
  Car,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type CsvValue = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvValue>;

// Simple CSV export helper
function downloadCsv(data: CsvRow[], filename: string) {
  if (data.length === 0) return;
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          const stringValue = String(value || "");
          return stringValue.includes(",") || stringValue.includes('"')
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
}

export default function SecretaryReports() {
  const { isAuthenticated, isDemo, user } = useAuth();
  const [exporting, setExporting] = useState<string | null>(null);

  const hasToken = isAuthenticated && !isDemo && user?.role === "secretary";

  // Fetch all data for reports
  const { data: houses = [] } = useQuery({
    queryKey: ["secretary-report-houses"],
    queryFn: housesApi.getAll,
    enabled: hasToken,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["secretary-report-members"],
    queryFn: membersApi.getAll,
    enabled: hasToken,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["secretary-report-vehicles"],
    queryFn: vehiclesApi.getAll,
    enabled: hasToken,
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ["secretary-report-maintenance"],
    queryFn: maintenanceApi.getAll,
    enabled: hasToken,
  });

  const { data: expenditures = [] } = useQuery({
    queryKey: ["secretary-report-expenditures"],
    queryFn: expendituresApi.getAll,
    enabled: hasToken,
  });

  const isLoading = houses.length === 0 && members.length === 0;

  const handleExport = async (reportType: string) => {
    setExporting(reportType);
    try {
      let data: CsvRow[] = [];
      let filename = "";

      switch (reportType) {
        case "houses":
          data = houses.map((h) => ({
            Block: h.block,
            "House Number": h.houseNumber,
            Floor: h.floor,
            Status: h.status,
          }));
          filename = "houses-report";
          break;
        case "members":
          data = members.map((m) => ({
            Name: m.name,
            Role: m.role,
            Phone: m.phone,
            Email: m.email,
            Active: m.isActive ? "Yes" : "No",
            "Assigned House": houses.find((h) => h.id === m.houseId)
              ? `${houses.find((h) => h.id === m.houseId)?.block}-${houses.find((h) => h.id === m.houseId)?.houseNumber}`
              : "N/A",
          }));
          filename = "members-report";
          break;
        case "maintenance":
          data = maintenance.map((m) => ({
            "Total Amount": `₹${m.totalAmount}`,
            "Amount Paid": `₹${m.amountPaid}`,
            Status: m.status,
            "From Month": m.fromMonth,
            "To Month": m.toMonth,
            "Property": houses.find((h) => h.id === m.houseId)
              ? `${houses.find((h) => h.id === m.houseId)?.block}-${houses.find((h) => h.id === m.houseId)?.houseNumber}`
              : "N/A",
          }));
          filename = "maintenance-report";
          break;
        case "vehicles":
          data = vehicles.map((v) => ({
            "Vehicle Number": v.vehicleNumber,
            Type: v.type,
            Color: v.color,
            "Assigned Property": houses.find((h) => h.id === v.houseId)
              ? `${houses.find((h) => h.id === v.houseId)?.block}-${houses.find((h) => h.id === v.houseId)?.houseNumber}`
              : "N/A",
          }));
          filename = "vehicles-report";
          break;
        case "expenditures":
          data = expenditures.map((e) => ({
            Amount: `₹${e.amount}`,
            Category: e.category,
            Description: e.description,
            Date: new Date(e.date || "").toLocaleDateString(),
          }));
          filename = "expenditures-report";
          break;
      }

      if (data.length > 0) {
        downloadCsv(data, filename);
        toast.success(`${filename} exported successfully`);
      } else {
        toast.error(`No data to export for ${reportType}`);
      }
    } catch (error) {
      toast.error("Failed to export report");
    } finally {
      setExporting(null);
    }
  };

  if (isLoading) {
    return (
      <SecretaryLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading reports data...</span>
        </div>
      </SecretaryLayout>
    );
  }

  const reports = [
    {
      id: "houses",
      title: "Houses Report",
      description: "Complete list of all properties you manage",
      icon: Home,
      records: houses.length,
    },
    {
      id: "members",
      title: "Members Report",
      description: "All registered members in your properties",
      icon: Users,
      records: members.length,
    },
    {
      id: "maintenance",
      title: "Maintenance Report",
      description: "Monthly maintenance billing and collection status",
      icon: Wallet,
      records: maintenance.length,
    },
    {
      id: "vehicles",
      title: "Vehicles Report",
      description: "Vehicle registry for your managed properties",
      icon: Car,
      records: vehicles.length,
    },
    {
      id: "expenditures",
      title: "Expenditures Report",
      description: "Financial summary of all expenses",
      icon: BarChart3,
      records: expenditures.length,
    },
  ];

  const totalBilled = maintenance.reduce((sum, m) => sum + (m.totalAmount || 0), 0);
  const totalCollected = maintenance
    .filter((m) => m.status === "Paid")
    .reduce((sum, m) => sum + (m.amountPaid || 0), 0);
  const pendingAmount = totalBilled - totalCollected;
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  const overduePayments = maintenance.filter(
    (m) => m.status === "Overdue"
  ).length;

  return (
    <SecretaryLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Secretary Reports</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive reports for your assigned properties and residents
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{houses.length}</div>
              <p className="text-xs text-muted-foreground">Under management</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">Registered</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{collectionRate}%</div>
              <p className="text-xs text-muted-foreground">₹{totalCollected} collected</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bills</CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overduePayments}</div>
              <p className="text-xs text-muted-foreground">₹{pendingAmount} pending</p>
            </CardContent>
          </Card>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => {
            const Icon = report.icon;
            return (
              <Card key={report.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="w-5 h-5" />
                        {report.title}
                      </CardTitle>
                      <CardDescription className="mt-2">{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      <strong>{report.records}</strong> records
                    </div>
                    <Button
                      onClick={() => handleExport(report.id)}
                      disabled={exporting === report.id || report.records === 0}
                      className="w-full gap-2"
                      size="sm"
                    >
                      {exporting === report.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Export as CSV
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Maintenance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Recent Maintenance Records
            </CardTitle>
            <CardDescription>Latest billing and collection status</CardDescription>
          </CardHeader>
          <CardContent>
            {maintenance.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No maintenance records</p>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Property</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {maintenance.slice(0, 10).map((m) => {
                      const house = houses.find((h) => h.id === m.houseId);
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            {house ? `${house.block}-${house.houseNumber}` : "Unknown"}
                          </TableCell>
                          <TableCell>₹{m.totalAmount}</TableCell>
                          <TableCell>
                            {m.toMonth ? new Date(m.toMonth).toLocaleDateString() : "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                m.status === "Paid" ? "default" : m.status === "Pending" ? "secondary" : "destructive"
                              }
                            >
                              {m.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Billed:</span>
                  <span className="font-semibold">₹{totalBilled}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Collected:</span>
                  <span className="font-semibold text-green-600">₹{totalCollected}</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-muted-foreground">Pending:</span>
                  <span className="font-semibold text-amber-600">₹{pendingAmount}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Occupied:</span>
                  <span className="font-semibold">{houses.filter((h) => h.status === "occupied").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vacant:</span>
                  <span className="font-semibold">{houses.filter((h) => h.status === "vacant").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Maintenance:</span>
                  <span className="font-semibold">{houses.filter((h) => h.status === "maintenance").length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Vehicles:</span>
                  <span className="font-semibold">{vehicles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Expenses:</span>
                  <span className="font-semibold">₹{expenditures.reduce((sum, e) => sum + (e.amount || 0), 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expense Items:</span>
                  <span className="font-semibold">{expenditures.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SecretaryLayout>
  );
}
