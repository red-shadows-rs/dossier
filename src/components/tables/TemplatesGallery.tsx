"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  Bot,
  CheckCircle2,
  Code2,
  Coins,
  Copy,
  Eye,
  FileCode2,
  FileLock2,
  FilePlus2,
  FileText,
  Globe,
  Languages,
  LayoutGrid,
  List,
  ListOrdered,
  Monitor,
  Network,
  RotateCcw,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input, InputAdornment } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { TemplatesTable, type TemplateTableLabels } from "@/components/tables/TemplatesTable";
import type { ActionResult } from "@/lib/result";

export type TemplateItem = {
  id: string;
  key: string | null;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  type: string;
  defaultLanguageMode: string;
  defaultsJson: string;
  clauseCount: number;
  isSystem: boolean;
};

function getTemplateIcon(key: string | null, type: string) {
  switch (key) {
    case "web-development":
      return {
        icon: Globe,
        bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
      };
    case "mobile-development":
      return {
        icon: Smartphone,
        bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      };
    case "desktop-development":
      return {
        icon: Monitor,
        bg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      };
    case "api-integrations":
      return {
        icon: Network,
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      };
    case "automation-bot-development":
      return {
        icon: Bot,
        bg: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      };
    case "devops-infrastructure":
      return {
        icon: Server,
        bg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      };
    case "nda":
      return {
        icon: ShieldCheck,
        bg: "bg-red-500/10 text-red-400 border-red-500/20",
      };
    default:
      return {
        icon: type === "nda" ? ShieldCheck : FileCode2,
        bg: "bg-primary/10 text-primary border-primary/20",
      };
  }
}

export function TemplatesGallery({
  rows,
  labels,
  archiveAction,
  canWrite = false,
}: {
  rows: TemplateItem[];
  labels: TemplateTableLabels & {
    useTemplate?: string;
    viewDetails?: string;
    searchPlaceholder?: string;
    viewCards?: string;
    viewTable?: string;
  };
  archiveAction: (raw: unknown) => Promise<ActionResult<null>>;
  canWrite?: boolean;
}) {
  const locale = useLocale();
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "contract" | "nda">("all");

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (selectedFilter !== "all" && row.type !== selectedFilter) return false;
      if (!query.trim()) return true;
      const q = query.trim().toLowerCase();
      const inAr = (row.nameAr || "").toLowerCase().includes(q) || (row.descriptionAr || "").toLowerCase().includes(q);
      const inEn = (row.nameEn || "").toLowerCase().includes(q) || (row.descriptionEn || "").toLowerCase().includes(q);
      const inKey = (row.key || "").toLowerCase().includes(q);
      return inAr || inEn || inKey;
    });
  }, [rows, query, selectedFilter]);

  return (
    <div className="flex flex-col gap-5">
      {/* Search and View Controls Bar */}
      <div className="rounded border border-border bg-card p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={labels.searchPlaceholder ?? (locale === "ar" ? "ابحث في القوالب بالاسم أو التخصص..." : "Search templates by name or description...")}
                startAdornment={
                  <InputAdornment position="start">
                    <Search size={16} className="text-muted-foreground" aria-hidden="true" />
                  </InputAdornment>
                }
              />
            </div>
            {query ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="shrink-0 h-10 px-2.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw size={14} className="me-1" />
                <span>{locale === "ar" ? "مسح" : "Clear"}</span>
              </Button>
            ) : null}
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Filter buttons */}
            <div className="flex items-center rounded border border-border/70 bg-muted/30 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setSelectedFilter("all")}
                className={`rounded px-2.5 py-1.5 transition-colors ${
                  selectedFilter === "all"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {locale === "ar" ? "الكل" : "All"} ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter("contract")}
                className={`rounded px-2.5 py-1.5 transition-colors ${
                  selectedFilter === "contract"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels.typeValues["contract"] ?? (locale === "ar" ? "العقود" : "Contracts")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedFilter("nda")}
                className={`rounded px-2.5 py-1.5 transition-colors ${
                  selectedFilter === "nda"
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels.typeValues["nda"] ?? (locale === "ar" ? "اتفاقيات سرية" : "NDAs")}
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded border border-border/70 bg-muted/30 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-label={labels.viewCards ?? "Cards"}
                title={labels.viewCards ?? "Cards"}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "cards"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label={labels.viewTable ?? "Table"}
                title={labels.viewTable ?? "Table"}
                className={`rounded p-1.5 transition-colors ${
                  viewMode === "table"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileCode2 size={40} className="text-muted-foreground" aria-hidden="true" />}
          title={locale === "ar" ? "لا توجد قوالب مطابقة" : "No matching templates"}
          description={
            locale === "ar"
              ? "جرّب تغيير كلمات البحث أو إعادة ضبط الفلاتر."
              : "Try adjusting your search terms or reset the filters."
          }
          className="border border-border/60 bg-card rounded py-12"
        />
      ) : viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filtered.map((row) => {
            const { icon: IconComponent, bg: iconBg } = getTemplateIcon(row.key, row.type);
            const parsedDefaults = (() => {
              try {
                return JSON.parse(row.defaultsJson);
              } catch {
                return {};
              }
            })();

            const milestones = parsedDefaults.milestonePreset?.rows as Array<{
              titleAr: string;
              titleEn: string;
              percentBp?: number;
            }> | undefined;

            const hasFees = parsedDefaults.hasFees ?? (row.type !== "nda");

            const primaryTitle =
              locale === "ar"
                ? (row.nameAr || row.nameEn)
                : (row.nameEn || row.nameAr);
            const secondaryTitle =
              locale === "ar" ? row.nameEn : row.nameAr;
            const description =
              locale === "ar"
                ? (row.descriptionAr || row.descriptionEn)
                : (row.descriptionEn || row.descriptionAr);

            return (
              <div
                key={row.id}
                className="group relative flex flex-col justify-between rounded-lg border border-border/80 bg-card p-5 transition-all duration-200 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex flex-col gap-3">
                  {/* Card Header: Icon + Badges */}
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105 ${iconBg}`}
                    >
                      <IconComponent size={22} aria-hidden="true" />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {row.isSystem ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                          <CheckCircle2 size={12} className="shrink-0" />
                          <span>{labels.system}</span>
                        </span>
                      ) : (
                        <Badge tone="gray" className="text-xs">
                          {labels.custom}
                        </Badge>
                      )}
                      <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                        {labels.typeValues[row.type] ?? row.type}
                      </span>
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="flex flex-col gap-0.5 pt-1">
                    <Link
                      href={`/templates/${row.id}`}
                      className="font-bold text-base sm:text-lg text-foreground tracking-tight transition-colors group-hover:text-primary line-clamp-1"
                    >
                      {primaryTitle}
                    </Link>
                    {secondaryTitle ? (
                      <p
                        className="text-xs font-medium text-muted-foreground/80 line-clamp-1 font-sans"
                        dir={locale === "ar" ? "ltr" : "rtl"}
                      >
                        {secondaryTitle}
                      </p>
                    ) : null}
                  </div>

                  {/* Description */}
                  {description ? (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 min-h-[34px]">
                      {description}
                    </p>
                  ) : (
                    <div className="min-h-[34px]" />
                  )}

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-2 py-1 font-medium text-muted-foreground">
                      <ListOrdered size={13} className="text-primary/70 shrink-0" />
                      <span>{row.clauseCount} {locale === "ar" ? "بنداً" : "clauses"}</span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-2 py-1 font-medium text-muted-foreground">
                      {hasFees ? (
                        <>
                          <Coins size={13} className="text-amber-400 shrink-0" />
                          <span>{locale === "ar" ? "يتضمن أتعاباً" : "Has fees"}</span>
                        </>
                      ) : (
                        <>
                          <FileLock2 size={13} className="text-blue-400 shrink-0" />
                          <span>{locale === "ar" ? "بدون أتعاب" : "No fees"}</span>
                        </>
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-muted/20 px-2 py-1 font-medium text-muted-foreground">
                      <Languages size={13} className="text-cyan-400 shrink-0" />
                      <span>{labels.languageValues[row.defaultLanguageMode] ?? row.defaultLanguageMode}</span>
                    </span>
                  </div>

                  {/* Milestone Preset Roadmap snippet */}
                  {milestones && milestones.length > 0 ? (
                    <div className="flex flex-col gap-1 rounded border border-border/50 bg-muted/15 p-2.5 text-xs">
                      <div className="flex items-center justify-between text-muted-foreground/80 font-medium">
                        <span>{locale === "ar" ? "دفعات الإنجاز المقترحة" : "Suggested milestones"}</span>
                        <span className="font-mono text-[11px]">{milestones.length} {locale === "ar" ? "دفعات" : "steps"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1">
                        {milestones.map((m, idx) => (
                          <div
                            key={idx}
                            className="flex-1 rounded bg-muted/40 border border-border/60 py-1 text-center font-mono text-[11px] text-foreground font-semibold"
                            title={`${locale === "ar" ? m.titleAr : m.titleEn} (${(m.percentBp ?? 0) / 100}%)`}
                          >
                            {(m.percentBp ?? 0) / 100}%
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Card Actions Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-4 mt-3 border-t border-border/50">
                  {canWrite ? (
                    <Link
                      href={`/contracts/new?templateId=${row.id}`}
                      className="flex-1 min-w-0"
                    >
                      <Button
                        type="button"
                        size="sm"
                        className="w-full gap-1.5 text-xs font-medium shadow-xs"
                      >
                        <FilePlus2 size={14} aria-hidden="true" />
                        <span>{labels.useTemplate ?? (locale === "ar" ? "إنشاء عقد بهذا القالب" : "Use template")}</span>
                      </Button>
                    </Link>
                  ) : null}

                  <Link href={`/templates/${row.id}`} className={canWrite ? "sm:shrink-0" : "flex-1"}>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="w-full gap-1.5 text-xs font-medium border-border/80"
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>{labels.viewDetails ?? (locale === "ar" ? "معاينة وتفاصيل" : "Details")}</span>
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="overflow-hidden rounded border border-border bg-card">
          <TemplatesTable
            rows={filtered}
            labels={labels}
            archiveAction={archiveAction}
          />
        </div>
      )}
    </div>
  );
}

