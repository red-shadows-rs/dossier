import { AppError } from "@/lib/errors";
import { env } from "@/lib/env";
import {
  closeBrowser,
  getBrowser,
  logPdfError,
  renderSemaphore,
} from "./browser";
import { buildFooterTemplate, type DocLang } from "./html/shared";

export type FooterMeta = {
  docNumber: string;
  code: string | null;
  kind?: "contract" | "invoice";
  lang?: DocLang;
};

async function renderOnce(html: string, footer: FooterMeta): Promise<Buffer> {
  const browser = await getBrowser();
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    // Block every network request; data: URIs are not intercepted (verified).
    await page.route("**/*", (route) => route.abort());
    await page.setContent(html, {
      waitUntil: "load",
      timeout: env.PDF_TIMEOUT_MS,
    });
    const isInvoice = footer.kind === "invoice";
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div style=\"font-size:0;height:0;margin:0;padding:0;display:none;\"></div>",
      footerTemplate: buildFooterTemplate(footer),
      margin: isInvoice
        ? { top: "0mm", bottom: "13mm", left: "0mm", right: "0mm" }
        : { top: "18mm", bottom: "20mm", left: "16mm", right: "16mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await context.close();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AppError("PDF_FAILED", "PDF rendering timed out")),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// 12.2/12.10 — concurrency-limited, one retry, then PDF_FAILED.
export async function renderPdf(
  html: string,
  footer: FooterMeta,
): Promise<Buffer> {
  await renderSemaphore.acquire();
  try {
    try {
      return await withTimeout(renderOnce(html, footer), env.PDF_TIMEOUT_MS);
    } catch (firstError) {
      logPdfError("pdf_render_retry", firstError);
      await closeBrowser();
      try {
        return await withTimeout(renderOnce(html, footer), env.PDF_TIMEOUT_MS);
      } catch (secondError) {
        logPdfError("pdf_render_failed", secondError);
        throw new AppError("PDF_FAILED", "Failed to generate the PDF");
      }
    }
  } finally {
    renderSemaphore.release();
  }
}
