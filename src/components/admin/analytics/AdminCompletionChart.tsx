import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSuspenseAnalyticsChartsData } from "@/hooks/useApi";
import type { AnalyticsFilters } from "@/services/api/analytics";

const COLORS = ["hsl(var(--primary))", "hsl(var(--primary-soft))", "#94a3b8"];

export function AdminCompletionChart({ filters }: { filters?: AnalyticsFilters }) {
  const { data } = useSuspenseAnalyticsChartsData(filters);
  const chartData = data?.completionBreakdown ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.35 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Completion status</CardTitle>
          <CardDescription>Attempts by status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #E5E7EB" }}
                    formatter={(value: number) => [value, "Attempts"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No attempts in range</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
