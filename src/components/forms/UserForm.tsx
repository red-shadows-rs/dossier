// Dossier - User Form Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Save, UserCheck, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ROLES } from "@/lib/constants";
import {
  createUserAction,
  updateUserAction,
} from "@/server/actions/users";

export type UserFormValues = {
  email: string;
  name: string;
  role: "owner" | "member" | "viewer";
  canSignForCompany: boolean;
};

export function UserForm({
  mode,
  userId,
  initial,
}: {
  mode: "create" | "edit";
  userId?: string;
  initial: UserFormValues;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [role, setRole] = useState(initial.role);
  const [canSign, setCanSign] = useState(initial.canSignForCompany);
  const [pending, setPending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [statusError, setStatusError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const base = {
      name: String(data.get("name") ?? ""),
      role,
      canSignForCompany: canSign,
    };
    setPending(true);
    setFieldErrors({});
    setStatusError(null);
    const result =
      mode === "create"
        ? await createUserAction({
            ...base,
            email: String(data.get("email") ?? ""),
            password: String(data.get("password") ?? ""),
          })
        : await updateUserAction({ ...base, id: userId });
    setPending(false);
    if (result.ok) {
      toast({
        title: t(mode === "create" ? "users.createdToast" : "users.savedToast"),
        tone: "success",
      });
      const id = result.data ? result.data.id : userId;
      router.push(`/users/${id}`);
      router.refresh();
      return;
    }
    if (result.error.fieldErrors) setFieldErrors(result.error.fieldErrors);
    const msg =
      result.error.code === "VALIDATION_FAILED"
        ? t("auth.requiredFields")
        : t(`errors.${result.error.code}`);
    setStatusError(msg);
    toast({ title: msg, tone: "error" });
  }

  function fieldError(name: string): string | null {
    const key = fieldErrors[name];
    return key ? t(key) : null;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 pb-28">
      {statusError && (
        <div
          role="alert"
          className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive animate-in fade-in-50"
        >
          {statusError}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <UserCheck size={18} className="text-primary" aria-hidden="true" />
            <span>{t("users.profile")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mode === "create" && (
            <Field
              label={t("users.email")}
              htmlFor="user-email"
              error={fieldError("email")}
              required
            >
              <Input
                id="user-email"
                name="email"
                type="email"
                dir="ltr"
                autoComplete="off"
                disabled={pending}
                className="text-start"
              />
            </Field>
          )}

          <Field
            label={t("users.name")}
            htmlFor="user-name"
            error={fieldError("name")}
            required
          >
            <Input
              id="user-name"
              name="name"
              defaultValue={initial.name}
              disabled={pending}
            />
          </Field>

          <Field label={t("users.roleLabel")} htmlFor="user-role">
            <Select
              id="user-role"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as UserFormValues["role"])
              }
              disabled={pending}
            >
              {ROLES.map((value) => (
                <option key={value} value={value}>
                  {t(`users.role.${value}`)}
                </option>
              ))}
            </Select>
          </Field>

          {mode === "create" && (
            <Field
              label={t("users.password")}
              htmlFor="user-password"
              error={fieldError("password")}
              required
            >
              <Input
                id="user-password"
                name="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                disabled={pending}
                className="text-start"
              />
            </Field>
          )}

          <div className="flex items-center pt-2 md:col-span-2">
            <Checkbox
              checked={canSign}
              onChange={(event) => setCanSign(event.currentTarget.checked)}
              disabled={pending}
              label={t("users.canSignForCompany")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded border border-border bg-card p-3 shadow-sm">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
          className="gap-1.5 text-xs sm:text-sm"
        >
          <X className="h-4 w-4" />
          <span>{t("common.cancel")}</span>
        </Button>

        <Button
          type="submit"
          loading={pending}
          className="gap-2 px-5 font-medium text-xs sm:text-sm shadow-xs ms-auto"
        >
          {mode === "create" ? (
            <>
              <UserPlus className="h-4 w-4" />
              <span>{t("users.create")}</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>{t("common.save")}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
