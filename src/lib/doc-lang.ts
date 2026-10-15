export const DOC_LANGS = ["ar", "en", "bilingual"] as const;
export type DocLang = (typeof DOC_LANGS)[number];

export type LanguageMode = "ar" | "en" | "bilingual";

export function allowedDocLangs(mode: LanguageMode): DocLang[] {
  if (mode === "ar") return ["ar"];
  if (mode === "en") return ["en"];
  return ["ar", "en", "bilingual"];
}

export function defaultDocLang(mode: LanguageMode): DocLang {
  return mode;
}

export function isDocLang(value: unknown): value is DocLang {
  return (
    typeof value === "string" &&
    (DOC_LANGS as readonly string[]).includes(value)
  );
}
