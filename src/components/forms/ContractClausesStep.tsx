"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react";
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
  onSaved,
}: {
  id: string;
  initial: BuilderClause[];
  hasFees: boolean;
  onSaved: () => void;
}) {
  const t = useTranslations();
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
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});
    const result = await saveClausesAction({ id, clauses });
    setPending(false);
    if (result.ok) {
      toast({ title: t("contracts.saved"), tone: "success" });
      onSaved();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  const generalError = Object.values(fieldErrors)[0];

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("contracts.builder.clausesTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {clauses.map((clause, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-md border border-border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground" dir="ltr">
                  {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <Tooltip content={t("contracts.clause.up")}>
                    <button
                      type="button"
                      aria-label={t("contracts.clause.up")}
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowUp size={14} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("contracts.clause.down")}>
                    <button
                      type="button"
                      aria-label={t("contracts.clause.down")}
                      onClick={() => move(index, 1)}
                      disabled={index === clauses.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <ArrowDown size={14} aria-hidden="true" />
                    </button>
                  </Tooltip>
                  <Tooltip content={t("contracts.clause.duplicate")}>
                    <button
                      type="button"
                      aria-label={t("contracts.clause.duplicate")}
                      onClick={() => duplicate(index)}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    >
                      <Copy size={14} aria-hidden="true" />
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
                      className="flex h-7 w-7 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </Tooltip>
                </div>
              </div>

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
                    rows={6}
                    value={clause.bodyAr}
                    onChange={(event) =>
                      update(index, { bodyAr: event.target.value })
                    }
                    className="text-start"
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
                    rows={6}
                    value={clause.bodyEn}
                    onChange={(event) =>
                      update(index, { bodyEn: event.target.value })
                    }
                    className="text-start"
                  />
                </Field>
              </div>
            </div>
          ))}

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
            <Plus size={15} aria-hidden="true" />
            <span>{t("contracts.clause.add")}</span>
          </Button>

          {generalError ? (
            <p role="alert" className="text-sm text-destructive">
              {t(generalError)}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={pending} className="gap-2">
          <Save size={16} aria-hidden="true" />
          <span>{t("common.save")}</span>
        </Button>
      </div>
    </form>
  );
}
