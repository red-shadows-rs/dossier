import { can } from "@/lib/permissions";
import type { SessionUser } from "@/server/auth/session";
import { listClients } from "./clients";
import { listContracts } from "./contracts";
import { listInvoices } from "./invoices";
import { listProjects } from "./projects";

export const SEARCH_LIMIT = 5;

export type SearchHit = {
  id: string;
  href: string;
  primary: string;
  secondary?: string;
};

export type SearchResults = {
  clients: SearchHit[];
  projects: SearchHit[];
  contracts: SearchHit[];
  invoices: SearchHit[];
};

export function searchAll(
  user: SessionUser,
  query: string,
  locale: "ar" | "en",
): SearchResults {
  const q = query.trim();
  const results: SearchResults = {
    clients: [],
    projects: [],
    contracts: [],
    invoices: [],
  };
  if (!q) {
    return results;
  }

  if (can(user, "clients.read")) {
    results.clients = listClients({ q, page: 1 })
      .rows.slice(0, SEARCH_LIMIT)
      .map((row) => ({
        id: row.id,
        href: `/clients/${row.id}`,
        primary:
          (locale === "ar" ? row.nameAr : row.nameEn) ||
          row.nameAr ||
          row.nameEn ||
          row.email ||
          row.id,
        secondary: row.email || row.city || undefined,
      }));
  }

  if (can(user, "projects.read")) {
    results.projects = listProjects({ q, page: 1 })
      .rows.slice(0, SEARCH_LIMIT)
      .map((row) => ({
        id: row.id,
        href: `/projects/${row.id}`,
        primary:
          (locale === "ar" ? row.nameAr : row.nameEn) ||
          row.nameAr ||
          row.nameEn ||
          row.code ||
          row.id,
        secondary: row.code || undefined,
      }));
  }

  if (can(user, "contracts.read")) {
    results.contracts = listContracts({ q, page: 1 })
      .rows.slice(0, SEARCH_LIMIT)
      .map((row) => ({
        id: row.id,
        href: `/contracts/${row.id}`,
        primary: row.number || row.id,
        secondary: (locale === "ar" ? row.titleAr : row.titleEn) || undefined,
      }));
  }

  if (can(user, "invoices.read")) {
    results.invoices = listInvoices({ q, page: 1 })
      .rows.slice(0, SEARCH_LIMIT)
      .map((row) => ({
        id: row.id,
        href: `/invoices/${row.id}`,
        primary: row.number || row.id,
        secondary: (locale === "ar" ? row.notesAr : row.notesEn) || undefined,
      }));
  }

  return results;
}