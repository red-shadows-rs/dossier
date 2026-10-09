"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  function fieldError(name: string): string | null {
    const key = fieldErrors[name];
    return key ? t(key) : null;
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("users.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {mode === "create" ? (
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
          ) : null}
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
          {mode === "create" ? (
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
          ) : null}
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={canSign}
              onChange={(event) => setCanSign(event.currentTarget.checked)}
              disabled={pending}
              className="size-4 rounded border-border"
            />
            {t("users.canSignForCompany")}
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={pending}
        >
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={pending}>
          {mode === "create" ? t("users.create") : t("common.save")}
        </Button>
      </div>
    </form>
  );
}
