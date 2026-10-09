export const DOC_LANGS = ["ar", "en", "bilingual"] as const;
export type DocLang = (typeof DOC_LANGS)[number];

export type LanguageMode = "ar" | "en" | "bilingual";

// A document may be exported in a language compatible with the contract mode:
// ar-only contracts cannot export en, and vice versa. Bilingual contracts may
// also be exported as a single-language view.
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
