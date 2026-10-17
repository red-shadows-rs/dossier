"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Copy,
  Plus,
  Save,
  ScrollText,
  Search,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import { Tooltip } from "@/components/ui/Tooltip";
import { saveClausesAction } from "@/server/actions/contracts";
import type { BuilderClause } from "./ContractBuilder";

export function ContractClausesStep({
  id,
  initial,
  hasFees,
  onSaved,
  onPrev,
  onNext,
}: {
  id: string;
  initial: BuilderClause[];
  hasFees: boolean;
  onSaved: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isAr = locale === "ar";
  const toast = useToast();
  const [clauses, setClauses] = useState<BuilderClause[]>(() =>
    initial.length > 0
      ? initial
      : [
          {
            key: null,
            titleAr: "",
            titleEn: "",
            bodyAr: "",
            bodyEn: "",
          },
        ],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedIndices, setCollapsedIndices] = useState<Set<number>>(
    new Set(),
  );
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update(index: number, patch: Partial<BuilderClause>) {
    setClauses((current) =>
      current.map((clause, i) =>
        i === index ? { ...clause, ...patch } : clause,
      ),
    );
  }

  function move(index: number, delta: number) {
    setClauses((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function duplicate(index: number) {
    setClauses((current) => {
      const next = [...current];
      const copy = { ...current[index] };
      next.splice(index + 1, 0, copy);
      return next;
    });
    toast({ title: t("contracts.saved"), tone: "info" });
  }

  function toggleCollapse(index: number) {
    setCollapsedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleCollapseAll() {
    if (collapsedIndices.size === clauses.length) {
      setCollapsedIndices(new Set());
    } else {
      setCollapsedIndices(new Set(clauses.map((_, i) => i)));
    }
  }

  async function handleSave(advance: boolean = false) {
    setPending(true);
    setFieldErrors({});
    const result = await saveClausesAction({ id, clauses });
    setPending(false);
    if (result.ok) {
      toast({ title: t("contracts.saved"), tone: "success" });
      onSaved();
      if (advance && onNext) {
        onNext();
      }
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void handleSave(false);
  }

  const filteredClauses = useMemo(() => {
    if (!searchQuery.trim()) return clauses.map((c, i) => ({ clause: c, index: i }));
    const query = searchQuery.toLowerCase().trim();
    return clauses
      .map((clause, index) => ({ clause, index }))
      .filter(
        ({ clause }) =>
          clause.titleAr.toLowerCase().includes(query) ||
          clause.titleEn.toLowerCase().includes(query) ||
          clause.bodyAr.toLowerCase().includes(query) ||
          clause.bodyEn.toLowerCase().includes(query),
      );
  }, [clauses, searchQuery]);

  const generalError = Object.values(fieldErrors)[0];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 pb-28">
      <Card>
        {/* Card Header & Controls Toolbar */}
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="inline-flex items-center gap-2">
            <ScrollText size={18} className="text-primary" aria-hidden="true" />
            <span>{t("contracts.builder.clausesTitle")}</span>
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {clauses.length}
            </span>
          </CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Input
                type="search"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 ps-8 text-xs"
              />
              <Search className="pointer-events-none absolute inset-y-0 start-2.5 my-auto h-3.5 w-3.5 text-muted-foreground" />
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleCollapseAll}
              className="h-8 gap-1.5 text-xs font-medium"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              <span>
                {collapsedIndices.size === clauses.length
                  ? "توسيع الكل"
                  : "طي الكل"}
              </span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={() =>
                setClauses((current) => [
                  ...current,
                  {
                    key: null,
                    titleAr: "",
                    titleEn: "",
                    bodyAr: "",
                    bodyEn: "",
                  },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t("contracts.clause.add")}</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {generalError ? (
            <p
              role="alert"
              className="rounded border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive"
            >
              {t(generalError)}
            </p>
          ) : null}

          {filteredClauses.length === 0 ? (
            <div className="rounded border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              {t("common.noResults")}
            </div>
          ) : null}

          <div className="flex flex-col gap-3.5">
            {filteredClauses.map(({ clause, index }) => {
              const isCollapsed = collapsedIndices.has(index);

              return (
                <div
                  key={index}
                  className="group flex flex-col rounded border border-border bg-card shadow-2xs transition-all hover:border-border hover:shadow-xs"
                >
                  {/* Clause Header Bar */}
                  <div className="flex items-center justify-between border-b border-border/50 bg-muted/20 px-4 py-2.5 rounded-t">
                    <div
                      className="flex flex-1 items-center gap-3 cursor-pointer select-none overflow-hidden pe-2"
                      onClick={() => toggleCollapse(index)}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-bold text-foreground font-mono">
                        {index + 1}
                      </span>
                      <span className="truncate text-xs font-semibold text-foreground">
                        {clause.titleAr || clause.titleEn || (
                          <span className="italic text-muted-foreground">
                            {t("contracts.clause.add")} #{index + 1}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Tooltip content={t("contracts.clause.up")}>
                        <button
                          type="button"
                          aria-label={t("contracts.clause.up")}
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="hidden sm:flex h-7 w-7 items-center justify-center rounded border border-border/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>

                      <Tooltip content={t("contracts.clause.down")}>
                        <button
                          type="button"
                          aria-label={t("contracts.clause.down")}
                          onClick={() => move(index, 1)}
                          disabled={index === clauses.length - 1}
                          className="hidden sm:flex h-7 w-7 items-center justify-center rounded border border-border/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>

                      <Tooltip content={t("contracts.clause.duplicate")}>
                        <button
                          type="button"
                          aria-label={t("contracts.clause.duplicate")}
                          onClick={() => duplicate(index)}
                          className="flex h-7 w-7 items-center justify-center rounded border border-border/70 text-muted-foreground transition-all hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>

                      <Tooltip content={t("common.delete")}>
                        <button
                          type="button"
                          aria-label={t("common.delete")}
                          onClick={() =>
                            setClauses((current) =>
                              current.length > 1
                                ? current.filter((_, i) => i !== index)
                                : current,
                            )
                          }
                          disabled={clauses.length <= 1}
                          className="flex h-7 w-7 items-center justify-center rounded border border-border/70 text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </Tooltip>

                      <div className="h-4 w-px bg-border/80 mx-1" />

                      <button
                        type="button"
                        onClick={() => toggleCollapse(index)}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Clause Body (Collapsible) */}
                  {!isCollapsed ? (
                    <div className="flex flex-col gap-3.5 p-4">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field
                          label={t("contracts.clause.titleAr")}
                          htmlFor={`cl-title-ar-${index}`}
                        >
                          <Input
                            id={`cl-title-ar-${index}`}
                            dir="rtl"
                            lang="ar"
                            value={clause.titleAr}
                            onChange={(event) =>
                              update(index, { titleAr: event.target.value })
                            }
                            className="text-start"
                          />
                        </Field>
                        <Field
                          label={t("contracts.clause.titleEn")}
                          htmlFor={`cl-title-en-${index}`}
                        >
                          <Input
                            id={`cl-title-en-${index}`}
                            dir="ltr"
                            lang="en"
                            value={clause.titleEn}
                            onChange={(event) =>
                              update(index, { titleEn: event.target.value })
                            }
                            className="text-start"
                          />
                        </Field>
                        <Field
                          label={t("contracts.clause.bodyAr")}
                          htmlFor={`cl-body-ar-${index}`}
                        >
                          <Textarea
                            id={`cl-body-ar-${index}`}
                            dir="rtl"
                            lang="ar"
                            rows={5}
                            value={clause.bodyAr}
                            onChange={(event) =>
                              update(index, { bodyAr: event.target.value })
                            }
                            className="text-start font-normal leading-relaxed"
                          />
                        </Field>
                        <Field
                          label={t("contracts.clause.bodyEn")}
                          htmlFor={`cl-body-en-${index}`}
                        >
                          <Textarea
                            id={`cl-body-en-${index}`}
                            dir="ltr"
                            lang="en"
                            rows={5}
                            value={clause.bodyEn}
                            onChange={(event) =>
                              update(index, { bodyEn: event.target.value })
                            }
                            className="text-start font-normal leading-relaxed"
                          />
                        </Field>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start gap-1.5"
            onClick={() =>
              setClauses((current) => [
                ...current,
                { key: null, titleAr: "", titleEn: "", bodyAr: "", bodyEn: "" },
              ])
            }
          >
            <Plus className="h-4 w-4" />
            <span>{t("contracts.clause.add")}</span>
          </Button>
        </CardContent>
      </Card>

      {/* Unified Action Footer */}
      {/* Unified Action Footer */}
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <div className="flex items-center gap-2">
          {onPrev && (
            <Button
              type="button"
              variant="secondary"
              onClick={onPrev}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              {isAr ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              <span>{t("common.previous")}</span>
            </Button>
          )}

          {onNext && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleSave(true)}
              disabled={pending}
              className="gap-1.5 text-xs sm:text-sm"
            >
              <span>{t("common.next")}</span>
              {isAr ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 ms-auto">
          <Button
            type="submit"
            loading={pending}
            className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs"
          >
            <Save className="h-4 w-4" />
            <span>{t("common.save")}</span>
          </Button>
        </div>
      </div>
    </form>
  );
}
