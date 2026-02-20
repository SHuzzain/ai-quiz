import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSuspenseAnalytics } from '@/hooks/useApi';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

export function AdminPerformanceBarChart() {
    const { data: analytics } = useSuspenseAnalytics();

    const testPerformanceData = analytics?.testAnalytics.map((t) => ({
        name: t.testTitle.length > 15 ? t.testTitle.substring(0, 15) + '...' : t.testTitle,
        fullName: t.testTitle,
        score: t.averageScore,
        attempts: t.totalAttempts,
    })) || [];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
        >
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Average Score by Test</CardTitle>
                    <CardDescription>Performance comparison across all active tests</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={testPerformanceData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    stroke="#6B7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#6B7280"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{
                                        backgroundColor: '#fff',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E7EB',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-sm">
                                                    <p className="font-semibold">{data.fullName}</p>
                                                    <div className="mt-2 space-y-1 text-xs">
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-gray-500">Avg Score:</span>
                                                            <span className="font-medium text-kid-blue">{data.score}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-4">
                                                            <span className="text-gray-500">Total Attempts:</span>
                                                            <span className="font-medium">{data.attempts}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                                    {testPerformanceData.map((entry, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.score >= 80 ? '#10B981' : entry.score >= 60 ? '#F59E0B' : '#EF4444'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
