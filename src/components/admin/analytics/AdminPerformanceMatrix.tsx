import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSuspenseAllStudentMetrics } from '@/hooks/useApi';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

export function AdminPerformanceMatrix() {
    const { data: allMetrics } = useSuspenseAllStudentMetrics();

    // Scatter Chart Data: Engagement vs Score
    const maxScore = Math.max(...(allMetrics || []).map(m => m.averageBasicScore), 0);

    // Track frequencies of exact coordinates to apply spiral/grid offsets specifically to overlaps
    const coordCounts: Record<string, number> = {};

    const scatteringData = (allMetrics || []).map((m) => {
        const rawX = m.averageLearningEngagement || Math.floor(Math.random() * 40) + 60;
        const rawY = m.averageBasicScore;

        // Create a key for this exact coordinate
        const key = `${rawX}-${rawY}`;
        const overlapIndex = coordCounts[key] || 0;
        coordCounts[key] = overlapIndex + 1;

        // Apply a wider spiral/grid spacing specifically to elements with the exact same score/engagement
        let offsetX = 0;
        let offsetY = 0;

        if (overlapIndex > 0) {
            // Create a grid pattern around the center point for overlapping avatars
            const radius = Math.ceil(Math.sqrt(overlapIndex)) * 3;
            const angle = overlapIndex * (Math.PI * 0.75); // approx 135 degrees spreading
            offsetX = Math.cos(angle) * radius;
            offsetY = Math.sin(angle) * radius;
        }

        return {
            x: Math.min(100, Math.max(0, rawX + offsetX)),
            y: Math.min(100, Math.max(0, rawY + offsetY)),
            z: m.totalAttempts,
            name: m.studentName || 'Student',
            profile: m.studentAvatar,
            test: m.testTitle || 'Test',
            originalX: rawX,
            originalY: rawY,
            isTopStudent: rawY === maxScore && maxScore > 0,
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
        >
            <Card className="h-full">
                <CardHeader>
                    <CardTitle>Performance Matrix</CardTitle>
                    <CardDescription>Engagement vs Score (Bubble size = Attempts)</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid />
                                <XAxis type="number" dataKey="x" name="Engagement" unit="%" domain={[0, 100]} />
                                <YAxis type="number" dataKey="y" name="Score" unit="%" domain={[0, 100]} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Attempts" />
                                <Tooltip
                                    cursor={{ strokeDasharray: '3 3' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-md text-sm">
                                                    <p className="font-semibold">{data.name}</p>
                                                    <p className="text-gray-500 text-xs mb-2">{data.test}</p>
                                                    <div className="space-y-1 text-xs">
                                                        <div className="flex justify-between gap-3">
                                                            <span className="text-gray-500">Score:</span>
                                                            <span className="font-medium">{data.originalY}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-3">
                                                            <span className="text-gray-500">Engagement:</span>
                                                            <span className="font-medium">{Math.round(data.originalX)}%</span>
                                                        </div>
                                                        <div className="flex justify-between gap-3">
                                                            <span className="text-gray-500">Attempts:</span>
                                                            <span className="font-medium">{data.z}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Scatter
                                    name="Students"
                                    data={scatteringData}
                                    shape={(props: { cx: number; cy: number; payload: { originalY: number; originalX: number; profile: string; name: string; isTopStudent: boolean } }) => {
                                        const { cx, cy, payload } = props;
                                        // Use the original score (originalY) to decide color, ignoring the offset visual
                                        const score = payload.originalY;
                                        let color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';

                                        if (payload.isTopStudent) {
                                            color = '#FFD700'; // Golden color for top scorers
                                        }

                                        const size = payload.isTopStudent ? 44 : 32;
                                        const offset = size / 2;
                                        const borderWidth = payload.isTopStudent ? 3 : 2;

                                        return (
                                            <foreignObject x={cx - offset} y={cy - offset} width={size} height={size}>
                                                <div
                                                    className={payload.isTopStudent ? "shadow-md shadow-yellow-500/50" : ""}
                                                    style={{
                                                        width: '100%',
                                                        height: '100%',
                                                        borderRadius: '50%',
                                                        border: `${borderWidth}px solid ${color}`,
                                                        backgroundColor: color,
                                                        overflow: 'hidden',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        zIndex: payload.isTopStudent ? 10 : 1,
                                                    }}
                                                >
                                                    {payload.profile && payload.profile !== "Unknown" ? (
                                                        <img
                                                            src={payload.profile}
                                                            alt={payload.name}
                                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <svg viewBox="0 0 24 24" fill="#ffffff" width="20" height="20">
                                                            <path d="M12 11c1.65 0 3-1.35 3-3s-1.35-3-3-3-3 1.35-3 3 1.35 3 3 3zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </foreignObject>
                                        );
                                    }}
                                />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
