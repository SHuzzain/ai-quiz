import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useSuspenseAnalyticsChartsData } from "@/hooks/useApi";
import type { AnalyticsFilters } from "@/services/api/analytics";

const BAR_COLORS = ["hsl(var(--primary-soft))", "hsl(var(--primary))", "#F59E0B", "#94a3b8"];

export function AdminHintsDistributionChart({ filters }: { filters?: AnalyticsFilters }) {
  const { data } = useSuspenseAnalyticsChartsData(filters);
  const chartData = data?.hintsDistribution ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.4 }}
    >
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Hints used per test</CardTitle>
          <CardDescription>
            Number of tests per hint range (e.g. &quot;1–2&quot; = 1 or 2 hints used in that test).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] w-full">
            {chartData.some((d) => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis
                    dataKey="range"
                    stroke="#6B7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(tick) => (tick === "0" ? "0 hints" : `${tick} hints`)}
                  />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #E5E7EB" }}
                    formatter={(value: number) => [value, "tests"]}
                    labelFormatter={(label) =>
                      label === "0"
                        ? "No hints used in the test"
                        : `${label} hints used in the test`
                    }
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Tests">
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No test data for the selected filters</div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
