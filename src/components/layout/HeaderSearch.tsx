"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiClickAwayListener from "@mui/material/ClickAwayListener";
import MuiPaper from "@mui/material/Paper";
import { Input, InputAdornment } from "@/components/ui/Input";

type Hit = { id: string; href: string; primary: string; secondary?: string };

type Results = {
  clients: Hit[];
  projects: Hit[];
  contracts: Hit[];
  invoices: Hit[];
};

export function HeaderSearch() {
  const t = useTranslations("search");
  const tn = useTranslations("nav");
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; data: Results };
        setResults(json.data);
        setOpen(true);
      } catch {
        // aborted or network error - ignore
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  const groups = results
    ? [
        { key: "clients", label: tn("clients"), hits: results.clients },
        { key: "projects", label: tn("projects"), hits: results.projects },
        { key: "contracts", label: tn("contracts"), hits: results.contracts },
        { key: "invoices", label: tn("invoices"), hits: results.invoices },
      ].filter((group) => group.hits.length > 0)
    : [];

  const showPanel = open && q.trim().length > 0;

  return (
    <MuiClickAwayListener onClickAway={() => setOpen(false)}>
      <MuiBox sx={{ position: "relative", width: "100%" }}>
        <form onSubmit={(event) => event.preventDefault()}>
          <Input
            name="q"
            type="search"
            value={q}
            onChange={(event) => {
              setQ(event.target.value);
              setOpen(true);
            }}
            onFocus={() => {
              if (q.trim()) setOpen(true);
            }}
            aria-label={t("placeholder")}
            placeholder={t("placeholder")}
            startAdornment={
              <InputAdornment position="start">
                <Search size={16} aria-hidden="true" />
              </InputAdornment>
            }
          />
        </form>
        {showPanel ? (
          <MuiPaper
            elevation={2}
            sx={{
              position: "absolute",
              insetInlineStart: 0,
              top: "calc(100% + 4px)",
              width: "100%",
              maxHeight: 360,
              overflowY: "auto",
              zIndex: (theme) => theme.zIndex.modal,
              p: 0.5,
            }}
          >
            {groups.length === 0 ? (
              <MuiBox
                sx={{ px: 1.5, py: 2, fontSize: 14, color: "text.secondary" }}
              >
                {t("noResults")}
              </MuiBox>
            ) : (
              groups.map((group) => (
                <MuiBox key={group.key} sx={{ mb: 0.5 }}>
                  <MuiBox
                    sx={{
                      px: 1.5,
                      py: 0.5,
                      fontSize: 12,
                      color: "text.secondary",
                    }}
                  >
                    {group.label}
                  </MuiBox>
                  {group.hits.map((hit) => (
                    <MuiBox
                      key={hit.id}
                      component="button"
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        router.push(hit.href);
                      }}
                      sx={{
                        display: "block",
                        width: "100%",
                        textAlign: "start",
                        border: 0,
                        bgcolor: "transparent",
                        cursor: "pointer",
                        px: 1.5,
                        py: 0.75,
                        "&:hover": { bgcolor: "action.hover" },
                      }}
                    >
                      <MuiBox
                        component="span"
                        sx={{ display: "block", fontSize: 14, color: "text.primary" }}
                      >
                        {hit.primary}
                      </MuiBox>
                      {hit.secondary ? (
                        <MuiBox
                          component="span"
                          sx={{
                            display: "block",
                            fontSize: 12,
                            color: "text.secondary",
                          }}
                        >
                          {hit.secondary}
                        </MuiBox>
                      ) : null}
                    </MuiBox>
                  ))}
                </MuiBox>
              ))
            )}
          </MuiPaper>
        ) : null}
      </MuiBox>
    </MuiClickAwayListener>
  );
}