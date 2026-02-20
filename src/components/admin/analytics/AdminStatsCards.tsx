import { motion } from 'framer-motion';
import { Trophy, TrendingUp, Target, Users, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSuspenseAnalytics } from '@/hooks/useApi';

export function AdminStatsCards() {
    const { data: analytics } = useSuspenseAnalytics();

    const stats = [
        {
            title: 'Average Score',
            value: `${analytics?.averageScore || 0}%`,
            description: 'Across all tests',
            icon: Trophy,
            color: 'text-kid-yellow',
            bgColor: 'bg-kid-yellow/10',
        },
        {
            title: 'Total Attempts',
            value: analytics?.totalAttempts || 0,
            description: 'All time',
            icon: TrendingUp,
            color: 'text-kid-blue',
            bgColor: 'bg-kid-blue/10',
        },
        {
            title: 'Completion Rate',
            value: `${Math.round((analytics?.totalAttempts || 0) > 0 ? 85 : 0)}%`,
            description: 'Tests finished',
            icon: Target,
            color: 'text-kid-green',
            bgColor: 'bg-kid-green/10',
        },
        {
            title: 'Active Students',
            value: analytics?.totalStudents || 0,
            description: 'Enrolled students',
            icon: Users,
            color: 'text-kid-purple',
            bgColor: 'bg-kid-purple/10',
        },
    ];

    return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                </div>
                                <span className="flex items-center text-xs font-medium text-muted-foreground">
                                    <Activity className="w-3 h-3 mr-1" />
                                    Live
                                </span>
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-2xl font-bold">{stat.value}</h3>
                                <p className="text-sm text-muted-foreground">{stat.title}</p>
                                <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                                    {stat.description}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            ))}
        </div>
    );
}
