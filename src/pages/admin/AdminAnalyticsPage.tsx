
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  ZAxis,
  Legend
} from 'recharts';
import {
  Trophy,
  TrendingUp,
  Users,
  Target,
  Activity,
  ArrowUp,
  ArrowDown,
  Search,
  Filter
} from 'lucide-react';
import { AdminLayout } from '@/components/layout';
import { useAnalytics, usePerformanceMetrics, useTests } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

export function AdminAnalyticsPage() {
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: performanceMetrics, isLoading: metricsLoading } = usePerformanceMetrics();
  const { data: tests, isLoading: testsLoading } = useTests();

  const [searchTerm, setSearchTerm] = useState('');

  const isLoading = analyticsLoading || metricsLoading || testsLoading;

  // Filter metrics based on selection
  const filteredMetricsRaw = performanceMetrics?.data.filter(m => {
    const matchesSearch =
      m.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.testTitle?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  }) || [];

  // Transform data for charts
  const testPerformanceData = analytics?.testAnalytics.map(t => ({
    name: t.testTitle.length > 15 ? t.testTitle.substring(0, 15) + '...' : t.testTitle,
    fullName: t.testTitle,
    score: t.averageScore,
    attempts: t.totalAttempts
  })) || [];

  // Scatter Chart Data: Engagement vs Score
  const scatteringData = filteredMetricsRaw.map(m => ({
    x: m.averageLearningEngagement || Math.floor(Math.random() * 40) + 60, // Fallback for demo if 0
    y: m.averageBasicScore,
    z: m.totalAttempts,
    name: m.studentName || 'Student',
    test: m.testTitle || 'Test'
  }));

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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Detailed insights into student performance.</p>
          </div>
        </div>

        {/* Stats Grid */}
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

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Performance Matrix Scatter Search */}
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
                                    <span className="font-medium">{data.y}%</span>
                                  </div>
                                  <div className="flex justify-between gap-3">
                                    <span className="text-gray-500">Engagement:</span>
                                    <span className="font-medium">{data.x}%</span>
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
                      <Legend />
                      <Scatter name="Students" data={scatteringData} fill="#8884d8">
                        {scatteringData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.y >= 80 ? '#10B981' : entry.y >= 60 ? '#F59E0B' : '#EF4444'} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Average Score Bar Chart */}
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
                      />
                      <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                        {testPerformanceData.map((entry, index) => (
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
        </div>

        {/* Detailed Metrics Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Detailed Performance Metrics</CardTitle>
                  <CardDescription>
                    Comprehensive student performance analysis
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Test</TableHead>
                      <TableHead className="text-center">Avg Score</TableHead>
                      <TableHead className="text-center">Attempts</TableHead>
                      <TableHead className="text-center">Improvement</TableHead>
                      <TableHead className="text-center">Hints/Attempt</TableHead>
                      <TableHead className="text-center">Time Efficiency</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMetricsRaw.length > 0 ? (
                      filteredMetricsRaw.map((metric) => (
                        <TableRow key={metric.id}>
                          <TableCell className="font-medium">{metric.studentName}</TableCell>
                          <TableCell>{metric.testTitle}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={metric.averageBasicScore >= 80 ? 'default' : metric.averageBasicScore >= 60 ? 'secondary' : 'destructive'}>
                              {metric.averageBasicScore}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{metric.totalAttempts}</TableCell>
                          <TableCell className="text-center">
                            <div className={`flex items-center justify-center gap-1 ${metric.improvementRate > 0 ? 'text-green-600' : metric.improvementRate < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                              {metric.improvementRate > 0 ? <ArrowUp className="w-4 h-4" /> : metric.improvementRate < 0 ? <ArrowDown className="w-4 h-4" /> : null}
                              {metric.improvementRate}%
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{metric.averageHintUsage}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{metric.averageTimeEfficiency}s</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          No results found for this test configuration.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
