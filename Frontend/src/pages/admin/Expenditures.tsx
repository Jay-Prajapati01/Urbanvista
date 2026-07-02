import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@/lib/auth";
import { expendituresApi } from "@/lib/api";
import type { Expenditure } from "@/lib/data";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Receipt,
  TrendingDown,
  Loader2,
  RefreshCw,
  DollarSign,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { format } from "date-fns";

const CATEGORY_COLORS: Record<string, string> = {
  Utilities: "#3b82f6",
  Maintenance: "#10b981",
  Security: "#f59e0b",
  Cleaning: "#8b5cf6",
  Admin: "#ec4899",
  Other: "#6b7280",
};

export default function Expenditures() {
  const { isAuthenticated, isDemo } = useAuth();

  const { data: expenses = [], isLoading, refetch, isFetching } = useQuery<Expenditure[]>({
    queryKey: ["expenditures"],
    queryFn: () => expendituresApi.getAll(),
    enabled: isAuthenticated && !isDemo,
  });

  const expensesArray = expenses;

  const categories = [...new Set(expensesArray.map((e) => e.category))].sort();
  const totalExpenses = expensesArray.reduce((sum: number, e) => sum + (e.amount || 0), 0);

  const expensesByCategory = categories.map((category: string) => ({
    category,
    total: expensesArray.filter((e) => e.category === category).reduce((sum: number, e) => sum + (e.amount || 0), 0),
    count: expensesArray.filter((e) => e.category === category).length,
  }));

  const categoryData = expensesByCategory.map((item) => ({
    name: item.category,
    value: item.total,
  }));

  const monthlyData = expensesArray
    .reduce((acc, e) => {
      const month = format(new Date(e.date), "MMM yyyy");
      if (!acc[month]) {
        acc[month] = { month, total: 0 };
      }
      acc[month].total += e.amount || 0;
      return acc;
    }, {} as Record<string, { month: string; total: number }>);

  const sortedMonthlyData = Object.values(monthlyData).sort((a, b) => 
    new Date(a.month).getTime() - new Date(b.month).getTime()
  );

  const paymentModeStats = expensesArray.reduce((acc, e) => {
    acc[e.paymentMode] = (acc[e.paymentMode] || 0) + (e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  const paymentModeData = Object.entries(paymentModeStats).map(([mode, amount]) => ({
    mode,
    amount,
  }));

  const highestCategory = expensesByCategory.reduce((max, cat) => 
    cat.total > max.total ? cat : max, { category: "None", total: 0, count: 0 }
  );

  const avgExpense = expensesArray.length > 0 ? totalExpenses / expensesArray.length : 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-steel-blue" />
          <span className="ml-3 text-muted-foreground">Loading expenditures data...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Expenditures Overview</h1>
            <p className="text-muted-foreground mt-1">
              Financial summary and category breakdown of all expenses
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2 px-4 py-2 text-sm border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{expenses.length} transactions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Highest Category</CardTitle>
              <DollarSign className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{highestCategory.category}</div>
              <p className="text-xs text-muted-foreground">₹{highestCategory.total.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Expense</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{avgExpense.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <p className="text-xs text-muted-foreground">per transaction</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">types of expenses</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Category-wise Expenses</CardTitle>
              <CardDescription>Distribution of expenses by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expensesByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Bar dataKey="total" name="Amount" radius={[0, 4, 4, 0]}>
                    {expensesByCategory.map((entry) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || "#6b7280"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Mode Distribution</CardTitle>
              <CardDescription>Expenses by payment method</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentModeData.map((item) => {
                  const percentage = totalExpenses > 0 ? (item.amount / totalExpenses) * 100 : 0;
                  return (
                    <div key={item.mode}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{item.mode}</span>
                        <span className="font-medium">₹{item.amount.toLocaleString()}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-steel-blue rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Expenditure Trend</CardTitle>
            <CardDescription>Expense distribution over time</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedMonthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sortedMonthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    name="Amount"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise Details</CardTitle>
            <CardDescription>Detailed breakdown by expense category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expensesByCategory.map((catData) => {
                const percentage = totalExpenses > 0 ? (catData.total / totalExpenses) * 100 : 0;
                return (
                  <div
                    key={catData.category}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-lg">{catData.category}</h3>
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[catData.category] || "#6b7280" }}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total</span>
                        <span className="font-medium">₹{catData.total.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Transactions</span>
                        <span className="font-medium">{catData.count}</span>
                      </div>
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Share</span>
                          <Badge variant="secondary">
                            {percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
