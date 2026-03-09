import { Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalyticsFilters } from "@/services/api/analytics";
import type { AnalyticsFilterOptions } from "@/services/api/analytics";

export interface AnalyticsFilterBarProps {
  options: AnalyticsFilterOptions | undefined;
  filters: AnalyticsFilters;
  onFiltersChange: (f: AnalyticsFilters) => void;
  isLoading?: boolean;
}

export function AnalyticsFilterBar({
  options,
  filters,
  onFiltersChange,
  isLoading,
}: AnalyticsFilterBarProps) {
  const set = (key: keyof AnalyticsFilters, value: string | undefined) => {
    const v = value === "all" || value === "" ? undefined : value;
    onFiltersChange({ ...filters, [key]: v });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-sm font-medium">Filters</span>
      </div>
      <Select
        value={filters.studentId ?? "all"}
        onValueChange={(v) => set("studentId", v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Student" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All students</SelectItem>
          {(options?.students ?? []).map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.testId ?? "all"}
        onValueChange={(v) => set("testId", v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Test" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tests</SelectItem>
          {(options?.tests ?? []).map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.title.length > 35 ? t.title.slice(0, 35) + "…" : t.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.topic ?? "all"}
        onValueChange={(v) => set("topic", v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Topic" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All topics</SelectItem>
          {(options?.topics ?? []).map((t) => (
            <SelectItem key={t} value={t}>
              {t}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.concept ?? "all"}
        onValueChange={(v) => set("concept", v)}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Concept" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All concepts</SelectItem>
          {(options?.concepts ?? []).map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
