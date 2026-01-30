"use client";

import { motion } from 'framer-motion';
import {
  Users,
  FileText,
  Trophy,
  TrendingUp,
  Clock,
  Lightbulb,
  ArrowUpRight,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useUsers, useAnalytics } from '@/features/admin';
import { useTests } from '@/features/quiz-creator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function AdminDashboard() {
  const { data: usersData } = useUsers();
  const { data: tests } = useTests();
  const { data: analytics } = useAnalytics();

  const stats = [
    {
      title: 'Total Students',
      value: usersData?.data.filter(u => u.role === 'student').length || 0,
      icon: Users,
      change: '+12%',
      color: 'text-kid-blue',
      bgColor: 'bg-kid-blue/10',
    },
    {
      title: 'Active Tests',
      value: tests?.filter(t => t.status === 'active').length || 0,
      icon: FileText,
      change: '+3',
      color: 'text-kid-purple',
      bgColor: 'bg-kid-purple/10',
    },
    {
      title: 'Avg. Score',
      value: `${analytics?.averageScore || 0}%`,
      icon: Trophy,
      change: '+5%',
      color: 'text-kid-green',
      bgColor: 'bg-kid-green/10',
    },
    {
      title: 'Total Attempts',
      value: analytics?.totalAttempts || 0,
      icon: TrendingUp,
      change: '+28',
      color: 'text-kid-orange',
      bgColor: 'bg-kid-orange/10',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <Link href="/admin/tests/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Test
          </Button>
        </Link>
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
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <span className="text-xs text-success font-medium flex items-center gap-0.5">
                    {stat.change}
                    <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions & Recent Tests */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Tests */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Tests</CardTitle>
            <Link href="/admin/tests" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests?.slice(0, 4).map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{test.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {test.questionCount} questions • {test.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${test.status === 'active'
                        ? 'bg-success/10 text-success'
                        : test.status === 'scheduled'
                          ? 'bg-warning/10 text-warning'
                          : test.status === 'draft'
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                      {test.status}
                    </span>
                    <Link href={`/admin/tests/${test.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics?.testAnalytics.slice(0, 3).map((ta) => (
                <div key={ta.testId} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{ta.testTitle}</span>
                    <span className="font-medium">{ta.averageScore}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${ta.averageScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Learning Insights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-kid-purple/10 rounded-lg">
                <Lightbulb className="w-5 h-5 text-kid-purple" />
                <div className="text-sm">
                  <p className="font-medium">2.5 hints/test</p>
                  <p className="text-muted-foreground">Avg hint usage</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-kid-blue/10 rounded-lg">
                <Clock className="w-5 h-5 text-kid-blue" />
                <div className="text-sm">
                  <p className="font-medium">12 minutes</p>
                  <p className="text-muted-foreground">Avg completion time</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
