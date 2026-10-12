// Dossier - Contracts Validate Service
// https://github.com/red-shadows-rs/dossier

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, users } from "@/db/schema";
import { CURRENCIES, type Locale } from "@/lib/constants";
import { compareDateStr, todayInTz } from "@/lib/dates";
import type { Issue } from "@/lib/validation/issues";
import type { SendContractInput } from "@/lib/validation/contracts";
import { getSettings } from "@/server/services/settings";
import {
  buildContractSnapshot,
  type SnapshotSignatory,
} from "@/server/services/contract-snapshot";
import { getContractDetail } from "@/server/services/contracts";
import { validateMilestones } from "@/server/services/milestones";
import {
  extractVariables,
  numberedParagraphLabels,
  parseBody,
  specialBlockSequence,
} from "@/server/templating/render-body";
import { buildVariableMap, OPTIONAL_VARIABLES } from "@/server/templating/variables";

export type SendValidationOptions = Partial<SendContractInput>;

export const CONTRACT_ISSUE_CODES = [
  "titleRequired",
  "scopeRequired",
  "companyNameRequired",
  "clientNameRequired",
  "projectNameRequired",
  "clauseTitleRequired",
  "clauseBodyRequired",
  "itemDescriptionRequired",
  "currencyInvalid",
  "noItems",
  "totalZero",
  "feesNotAllowed",
  "noMilestones",
  "milestonesInvalid",
  "startDateRequired",
  "endBeforeStart",
  "signingDeadlinePast",
  "noClauses",
  "missingVariable",
  "clientSignatoryRequired",
  "clientEmailRequired",
  "clientEmailInvalid",
  "providerSignerRequired",
  "blockSequenceMismatch",
  "signaturesBlock",
  "paymentScheduleBlock",
  "companyTaxNumberMissing",
  "clientTaxNumberMissing",
  "endBeforeMilestone",
  "paragraphCountMismatch",
  "bankDetailsMissing",
] as const;

type IssueCode = (typeof CONTRACT_ISSUE_CODES)[number];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requiredLanguages(mode: "ar" | "en" | string): Locale[] {
  if (mode === "en") return ["en"];
  return ["ar"];
}

function error(
  code: IssueCode,
  field: string,
  params?: Record<string, string | number>,
): Issue {
  return {
    severity: "error",
    code,
    field,
    messageKey: `contracts.issue.${code}`,
    params,
  };
}

function warning(
  code: IssueCode,
  field: string,
  params?: Record<string, string | number>,
): Issue {
  return {
    severity: "warning",
    code,
    field,
    messageKey: `contracts.issue.${code}`,
    params,
  };
}

function resolveProviderSigner(userId: string | undefined): string | null {
  if (userId) {
    const row = db
      .select({
        id: users.id,
        status: users.status,
        canSign: users.canSignForCompany,
      })
      .from(users)
      .where(eq(users.id, userId))
      .get();
    return row && row.status === "active" && row.canSign ? row.id : null;
  }
  const first = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.canSignForCompany, true), eq(users.status, "active")))
    .get();
  return first?.id ?? null;
}

function buildSignatories(
  id: string,
  options: SendValidationOptions,
): SnapshotSignatory[] {
  const contract = getContractDetail(id).contract;
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, contract.clientId))
    .get();
  const clientLang: Locale = contract.languageMode === "en" ? "en" : "ar";
  const defaultClientName =
    (clientLang === "ar"
      ? client?.repNameAr || client?.repNameEn
      : client?.repNameEn || client?.repNameAr) ||
    (clientLang === "ar"
      ? client?.nameAr || client?.nameEn || client?.legalNameAr || client?.legalNameEn
      : client?.nameEn || client?.nameAr || client?.legalNameEn || client?.legalNameAr) ||
    "";
  const clientName = options.clientSignatoryName ?? defaultClientName ?? "";
  const clientEmail = options.clientSignatoryEmail ?? client?.email ?? null;

  const providerId = resolveProviderSigner(options.providerSignerUserId);
  let providerName = "";
  let providerTitle: string | null = null;
  if (providerId) {
    const user = db.select().from(users).where(eq(users.id, providerId)).get();
    if (user) {
      providerName = user.name;
      providerTitle =
        clientLang === "ar" ? user.signerTitleAr : user.signerTitleEn;
    }
  }

  return [
    {
      role: "provider",
      name: providerName,
      title: providerTitle,
      email: null,
    },
    {
      role: "client",
      name: clientName,
      title: options.clientSignatoryTitle ?? null,
      email: clientEmail,
    },
  ];
}

export function validateContractForSend(
  id: string,
  options: SendValidationOptions = {},
): Issue[] {
  const { contract, items, milestones, clauses } = getContractDetail(id);
  const company = getSettings("company");
  const defaults = getSettings("defaults");
  const today = todayInTz(defaults.timezone);
  const issues: Issue[] = [];
  const langs = requiredLanguages(contract.languageMode);

  const snapshot = buildContractSnapshot(id, buildSignatories(id, options));

  for (const lang of langs) {
    const title = lang === "ar" ? contract.titleAr : contract.titleEn;
    const scope = lang === "ar" ? contract.scopeAr : contract.scopeEn;
    const companyName = lang === "ar" ? company.nameAr : company.nameEn;
    const clientName =
      lang === "ar" ? snapshot.client.nameAr : snapshot.client.nameEn;
    const projectName =
      lang === "ar" ? snapshot.project.nameAr : snapshot.project.nameEn;
    if (!title) issues.push(error("titleRequired", `title.${lang}`, { lang }));
    if (!scope) issues.push(error("scopeRequired", `scope.${lang}`, { lang }));
    if (!companyName)
      issues.push(error("companyNameRequired", `company.${lang}`, { lang }));
    if (!clientName)
      issues.push(error("clientNameRequired", `client.name.${lang}`, { lang }));
    if (!projectName)
      issues.push(
        error("projectNameRequired", `project.name.${lang}`, { lang }),
      );
    for (const clause of clauses) {
      const clauseTitle = lang === "ar" ? clause.titleAr : clause.titleEn;
      const clauseBody = lang === "ar" ? clause.bodyAr : clause.bodyEn;
      if (!clauseTitle)
        issues.push(
          error("clauseTitleRequired", `clause.${clause.position}.title`, {
            position: clause.position,
            lang,
          }),
        );
      if (!clauseBody)
        issues.push(
          error("clauseBodyRequired", `clause.${clause.position}.body`, {
            position: clause.position,
            lang,
          }),
        );
    }
    for (const item of items) {
      const description =
        lang === "ar" ? item.descriptionAr : item.descriptionEn;
      if (!description)
        issues.push(
          error(
            "itemDescriptionRequired",
            `item.${item.position}.description`,
            {
              position: item.position,
              lang,
            },
          ),
        );
    }
  }

  if (!(contract.currency in CURRENCIES)) {
    issues.push(error("currencyInvalid", "currency"));
  }
  if (contract.hasFees) {
    if (items.length < 1) issues.push(error("noItems", "items"));
    if (contract.totalMinor <= 0) issues.push(error("totalZero", "totalMinor"));
  } else if (items.length > 0 || milestones.length > 0) {
    issues.push(error("feesNotAllowed", "hasFees"));
  }

  if (contract.hasFees) {
    if (milestones.length < 1) {
      issues.push(error("noMilestones", "milestones"));
    } else {
      const milestoneIssues = validateMilestones({
        net: contract.netMinor,
        tax: contract.taxMinor,
        mode: contract.milestoneMode,
        rows: milestones.map((m) => ({
          titleAr: m.titleAr,
          titleEn: m.titleEn,
          percentBp: m.percentBp,
          amountMinor: m.amountMinor,
        })),
      });
      if (milestoneIssues.length > 0) {
        issues.push(error("milestonesInvalid", "milestones"));
      }
    }
  }

  if (!contract.startDate) {
    issues.push(error("startDateRequired", "startDate"));
  } else if (
    contract.endDate &&
    compareDateStr(contract.endDate, contract.startDate) < 0
  ) {
    issues.push(error("endBeforeStart", "endDate"));
  }
  if (
    contract.signingDeadline &&
    compareDateStr(contract.signingDeadline, today) < 0
  ) {
    issues.push(error("signingDeadlinePast", "signingDeadline"));
  }

  if (clauses.length < 1) {
    issues.push(error("noClauses", "clauses"));
  }

  for (const lang of langs) {
    const map = buildVariableMap(snapshot, lang);
    for (const clause of clauses) {
      const body = lang === "ar" ? clause.bodyAr : clause.bodyEn;
      const seen = new Set<string>();
      for (const variable of extractVariables(body)) {
        if (seen.has(variable)) continue;
        seen.add(variable);
        if (variable === "contract.number") continue;
        if (OPTIONAL_VARIABLES.has(variable)) continue;
        if (!map[variable]) {
          issues.push(
            error("missingVariable", `clause.${clause.position}.${variable}`, {
              variable,
              position: clause.position,
              lang,
            }),
          );
        }
      }
    }
  }

  const clientLang: Locale = contract.languageMode === "en" ? "en" : "ar";
  const clientRow = snapshot.client;
  const clientName =
    options.clientSignatoryName ??
    ((clientLang === "ar"
      ? clientRow.repNameAr || clientRow.repNameEn
      : clientRow.repNameEn || clientRow.repNameAr) ||
      (clientLang === "ar"
        ? clientRow.nameAr || clientRow.nameEn || clientRow.legalNameAr || clientRow.legalNameEn
        : clientRow.nameEn || clientRow.nameAr || clientRow.legalNameEn || clientRow.legalNameAr) ||
      "");
  const clientEmail = options.clientSignatoryEmail ?? clientRow.email;
  if (!clientName)
    issues.push(error("clientSignatoryRequired", "clientSignatoryName"));
  if (!clientEmail) {
    issues.push(error("clientEmailRequired", "clientSignatoryEmail"));
  } else if (!EMAIL_RE.test(clientEmail)) {
    issues.push(error("clientEmailInvalid", "clientSignatoryEmail"));
  }

  if (!resolveProviderSigner(options.providerSignerUserId)) {
    issues.push(error("providerSignerRequired", "providerSignerUserId"));
  }

  let signaturesCount = 0;
  let paymentScheduleCount = 0;
  for (const clause of clauses) {
    const arSequence = specialBlockSequence(clause.bodyAr);
    const enSequence = specialBlockSequence(clause.bodyEn);
    signaturesCount += arSequence.filter((n) => n === "signatures").length;
    paymentScheduleCount += arSequence.filter(
      (n) => n === "payment_schedule",
    ).length;
    if (clause.bodyAr.trim() && clause.bodyEn.trim()) {
      if (arSequence.join(",") !== enSequence.join(",")) {
        issues.push(
          error("blockSequenceMismatch", `clause.${clause.position}.blocks`, {
            position: clause.position,
          }),
        );
      }
    }
  }
  if (signaturesCount !== 1) {
    issues.push(error("signaturesBlock", "blocks", { count: signaturesCount }));
  }
  if (contract.hasFees && paymentScheduleCount < 1) {
    issues.push(error("paymentScheduleBlock", "blocks"));
  }

  if (contract.endDate && milestones.length > 0) {
    const lastDue = milestones
      .map((m) => m.dueDate)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1);
    if (lastDue && compareDateStr(contract.endDate, lastDue) < 0) {
      issues.push(warning("endBeforeMilestone", "endDate"));
    }
  }
  for (const clause of clauses) {
    if (clause.bodyAr.trim() && clause.bodyEn.trim()) {
      const arCount = numberedParagraphLabels(
        clause.position,
        parseBody(clause.bodyAr),
      ).length;
      const enCount = numberedParagraphLabels(
        clause.position,
        parseBody(clause.bodyEn),
      ).length;
      if (arCount !== enCount) {
        issues.push(
          warning("paragraphCountMismatch", `clause.${clause.position}`, {
            position: clause.position,
          }),
        );
      }
    }
  }
  const bank = company.bank;
  if (
    !bank.iban &&
    !bank.accountHolder &&
    !bank.bankNameAr &&
    !bank.bankNameEn
  ) {
    issues.push(warning("bankDetailsMissing", "company.bank"));
  }

  return issues;
}
