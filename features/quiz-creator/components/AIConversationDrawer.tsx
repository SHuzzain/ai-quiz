"use client";

import * as React from "react";
import {
    Sparkles,
    CheckCircle2,
    MessageCircle,
    BookOpen,
    FileText,
    CheckCircle,
} from "lucide-react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Topic {
    id: string;
    title: string;
    description: string;
    difficulty: "easy" | "medium" | "hard";
    estimatedQuestions: number;
}

interface AIConversationDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: {
        type: "lesson" | "test" | "solution";
        greeting: string;
        analysis: string;
        topics: Topic[];
        suggestedQuestionCount: number;
        clarification?: {
            question: string;
            options: string[];
        };
    } | null;
    onConfirm: (selectedTopics: string[], questionCount: number) => void;
    onClarify?: (answer: string) => void;
    isGenerating: boolean;
}

export function AIConversationDrawer({
    isOpen,
    onClose,
    analysis,
    onConfirm,
    onClarify,
    isGenerating
}: AIConversationDrawerProps) {
    const [selectedTopics, setSelectedTopics] = React.useState<string[]>([]);
    const [questionCount, setQuestionCount] = React.useState<number>(5);
    const [showOtherInput, setShowOtherInput] = React.useState(false);
    const [otherInputValue, setOtherInputValue] = React.useState("");

    React.useEffect(() => {
        if (analysis) {
            // Select all topics by default
            setSelectedTopics(analysis.topics.map(t => t.id));
            setQuestionCount(analysis.suggestedQuestionCount);
            // Reset state when new analysis arrives
            setShowOtherInput(false);
            setOtherInputValue("");
        }
    }, [analysis]);

    const toggleTopic = (id: string) => {
        setSelectedTopics(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleOptionClick = (option: string) => {
        if (option.toLowerCase() === "other") {
            setShowOtherInput(true);
        } else {
            onClarify?.(option);
        }
    };

    const handleOtherSubmit = () => {
        if (otherInputValue.trim()) {
            onClarify?.(otherInputValue);
        }
    };

    if (!analysis) return null;

    const isClarificationNeeded = !!analysis.clarification;

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !isGenerating && onClose()}>
            <SheetContent side="right" className="w-full sm:max-w-md p-0 gap-0 border-l-0 flex flex-col">
                <div className="absolute inset-0 bg-primary/5 -z-10 bg-[radial-gradient(circle_at_top_right,var(--color-primary)_0%,transparent_40%)] opacity-10" />

                <SheetHeader className="p-6 pb-4 border-b bg-background/50 backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl">Smart Assistant</SheetTitle>
                            <SheetDescription>Conversational Content Analysis</SheetDescription>
                        </div>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-6">
                    <div className="py-6 space-y-8">
                        {/* AI Greeting */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex gap-3"
                        >
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <MessageCircle className="w-4 h-4 text-primary" />
                            </div>
                            <div className="space-y-4">
                                <div className="bg-primary/5 rounded-2xl p-4 rounded-tl-none border border-primary/10">
                                    <p className="text-sm font-medium leading-relaxed">
                                        {analysis.greeting}
                                    </p>
                                </div>
                                <div className="bg-muted/30 rounded-2xl p-4 border text-sm leading-relaxed">
                                    {analysis.analysis}
                                </div>
                            </div>
                        </motion.div>

                        {/* CLARIFICATION BLOCK */}
                        {isClarificationNeeded && analysis.clarification && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4 p-4 border rounded-2xl bg-primary/5 border-primary/20"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                                        ?
                                    </div>
                                    <h4 className="font-semibold text-sm leading-tight text-primary">
                                        {analysis.clarification.question}
                                    </h4>
                                </div>

                                {!showOtherInput ? (
                                    <div className="grid gap-2">
                                        {analysis.clarification.options.map((option, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                className="justify-start h-auto py-3 px-4 text-left whitespace-normal hover:bg-primary/10 hover:border-primary/30 transition-all font-normal"
                                                onClick={() => handleOptionClick(option)}
                                                disabled={isGenerating}
                                            >
                                                {option}
                                            </Button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium text-muted-foreground ml-1">
                                                Please specify:
                                            </label>
                                            <textarea
                                                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                                                placeholder="Type your explanation here..."
                                                value={otherInputValue}
                                                onChange={(e) => setOtherInputValue(e.target.value)}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowOtherInput(false)}
                                                disabled={isGenerating}
                                            >
                                                Back
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1"
                                                onClick={handleOtherSubmit}
                                                disabled={!otherInputValue.trim() || isGenerating}
                                            >
                                                Submit Answer
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Document Type Badge - Show only if not clarifying or just as info */}
                        {!isClarificationNeeded && (
                            <div className="flex items-center gap-2 justify-center py-2 px-4 rounded-full bg-primary/5 border border-primary/10 w-fit mx-auto">
                                {analysis.type === 'lesson' ? <BookOpen className="w-4 h-4 text-primary" /> : <FileText className="w-4 h-4 text-primary" />}
                                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                                    Detected: {analysis.type.replace('-', ' ')}
                                </span>
                            </div>
                        )}

                        {/* Topic Selection - Hide if clarifying */}
                        {!isClarificationNeeded && analysis.topics.length > 0 && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-sm font-semibold flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-primary" />
                                        Select Topics to Include
                                    </h4>
                                    <span className="text-xs text-muted-foreground">
                                        {selectedTopics.length} selected
                                    </span>
                                </div>

                                <div className="grid gap-3">
                                    {analysis.topics.map((topic, idx) => (
                                        <motion.div
                                            key={topic.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            onClick={() => toggleTopic(topic.id)}
                                            className={cn(
                                                "p-4 rounded-xl border transition-all cursor-pointer group",
                                                selectedTopics.includes(topic.id)
                                                    ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                                    : "bg-background hover:bg-muted/50"
                                            )}
                                        >
                                            <div className="flex gap-3">
                                                <Checkbox
                                                    checked={selectedTopics.includes(topic.id)}
                                                    onCheckedChange={() => toggleTopic(topic.id)}
                                                    className="mt-1"
                                                />
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm">{topic.title}</span>
                                                        <Badge variant="secondary" className="text-[10px] h-4">
                                                            {topic.difficulty}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground leading-normal">
                                                        {topic.description}
                                                    </p>
                                                    <div className="flex items-center gap-1 text-[10px] font-medium text-primary mt-1">
                                                        <Sparkles className="w-2.5 h-2.5" />
                                                        ~{topic.estimatedQuestions} questions possible
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Question Count Selection - Hide if clarifying */}
                        {!isClarificationNeeded && (
                            <div className="p-4 rounded-2xl bg-accent/30 border space-y-3">
                                <label className="text-sm font-semibold block">Total Questions to Generate</label>
                                <div className="flex items-center gap-4">
                                    {[5, 10, 15, 20].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setQuestionCount(val)}
                                            className={cn(
                                                "flex-1 py-2 rounded-lg text-sm font-bold transition-all border",
                                                questionCount === val
                                                    ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-105"
                                                    : "bg-background border-input hover:bg-muted"
                                            )}
                                        >
                                            {val}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Footer - Hide if clarifying to prevent premature generation */}
                {!isClarificationNeeded && (
                    <SheetFooter className="p-6 border-t bg-background/50 backdrop-blur-sm">
                        <div className="flex flex-col w-full gap-3">
                            <Button
                                className="w-full h-12 text-lg font-bold gap-2 shadow-xl shadow-primary/20"
                                onClick={() => onConfirm(selectedTopics, questionCount)}
                                disabled={selectedTopics.length === 0 || isGenerating}
                            >
                                {isGenerating ? (
                                    <>
                                        <Sparkles className="w-5 h-5 animate-pulse" />
                                        Generating Quiz...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Generate Quiz Now
                                    </>
                                )}
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground uppercase tracking-widest font-bold">
                                Powered by Perfect AI GPT-4o
                            </p>
                        </div>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}
