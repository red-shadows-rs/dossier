"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import InputAdornment from "@mui/material/InputAdornment";
import { Input } from "@/components/ui/Input";

export function HeaderSearch() {
  const t = useTranslations("search");
  const router = useRouter();
  const [value, setValue] = useState("");

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
      className="w-full max-w-sm"
    >
      <Input
        name="q"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        aria-label={t("placeholder")}
        placeholder={t("placeholder")}
        startAdornment={
          <InputAdornment position="start">
            <Search size={16} aria-hidden="true" />
          </InputAdornment>
        }
      />
    </form>
  );
}