"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Brain,
  Trophy,
  Heart,
  ArrowRight,
  Star,
  Lightbulb,
  Target
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Learning',
    description: 'Smart hints and personalized explanations make learning fun and effective.',
    color: 'bg-kid-purple',
  },
  {
    icon: Heart,
    title: 'Kid-Friendly Design',
    description: 'Beautiful, intuitive interface designed specifically for children aged 5-10.',
    color: 'bg-kid-pink',
  },
  {
    icon: Trophy,
    title: 'Track Progress',
    description: 'Watch your child grow with detailed analytics and achievement tracking.',
    color: 'bg-kid-yellow',
  },
  {
    icon: Lightbulb,
    title: 'Micro Learning',
    description: 'When stuck, kids get bite-sized explanations they can understand.',
    color: 'bg-kid-blue',
  },
  {
    icon: Target,
    title: 'Fill-in-the-Blank',
    description: 'Engaging question format that tests understanding, not just memorization.',
    color: 'bg-kid-green',
  },
  {
    icon: Star,
    title: 'Earn Stars',
    description: 'Gamified rewards keep children motivated and excited to learn more.',
    color: 'bg-kid-orange',
  },
];

const stats = [
  { value: '10,000+', label: 'Happy Students' },
  { value: '500+', label: 'Tests Created' },
  { value: '95%', label: 'Completion Rate' },
  { value: '4.9/5', label: 'Parent Rating' },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-kid-purple/10 rounded-full blur-3xl" />
          <div className="absolute top-40 right-20 w-40 h-40 bg-kid-pink/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-1/3 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-6 py-24 md:py-32 relative">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Learning for Kids
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6"
            >
              Make Learning{' '}
              <span className="bg-linear-to-r from-kid-purple via-kid-pink to-kid-orange bg-clip-text text-transparent">
                Magical
              </span>
              {' '}for Your Child
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            >
              An AI-assisted test and learning platform designed for children aged 5-10.
              Smart hints, fun challenges, and personalized learning paths.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/auth?mode=signup" className="btn-kid">
                Start Learning Free
                <ArrowRight className="w-5 h-5 ml-2 inline" />
              </Link>
              <Link
                href="/sign-in"
                className="px-8 py-4 rounded-2xl border-2 border-border font-semibold text-foreground hover:bg-muted transition-colors"
              >
                I Have an Account
              </Link>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
          >
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything Your Child Needs to Succeed
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Our platform combines the best of AI technology with proven learning methods.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="card-elevated hover:shadow-lg"
              >
                <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How LearnQuest Works
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Simple for parents, fun for kids.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Teachers Create Tests</h3>
              <p className="text-muted-foreground">
                Upload questions or let AI extract them from documents automatically.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-kid-purple/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-kid-purple">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Students Take Tests</h3>
              <p className="text-muted-foreground">
                Fun, interactive fill-in-the-blank questions with helpful hints.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-kid-pink/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-kid-pink">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Learn & Grow</h3>
              <p className="text-muted-foreground">
                Track progress, earn stars, and get personalized micro-learning.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{ background: 'var(--gradient-kid)' }}
        />
        <div className="container mx-auto px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Ready to Start Your Child&apos;s Learning Adventure?
            </h2>
            <p className="text-xl text-muted-foreground mb-10">
              Join thousands of happy families already using LearnQuest.
            </p>
            <Link href="/auth?mode=signup" className="btn-kid inline-flex items-center">
              <Sparkles className="w-5 h-5 mr-2" />
              Get Started for Free
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
