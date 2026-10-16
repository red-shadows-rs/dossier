"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, Gauge, RotateCcw } from "lucide-react";
import { Logo } from "@/components/layout/Logo";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const year = new Date().getFullYear();

  useEffect(() => {
    console.error("Global system error boundary:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>خطأ في النظام - Dossier</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --bg: #090d16;
            --card: #0f172a;
            --border: rgba(148, 163, 184, 0.15);
            --fg: #f8fafc;
            --muted: #94a3b8;
            --dest: #ef4444;
            --dest-bg: rgba(239, 68, 68, 0.1);
            --dest-border: rgba(239, 68, 68, 0.25);
            --btn-sec-bg: #1e293b;
            --btn-sec-border: rgba(148, 163, 184, 0.2);
          }
          @media (prefers-color-scheme: light) {
            :root {
              --bg: #f8fafc;
              --card: #ffffff;
              --border: rgba(15, 23, 42, 0.1);
              --fg: #0f172a;
              --muted: #64748b;
              --dest: #dc2626;
              --dest-bg: rgba(220, 38, 38, 0.08);
              --dest-border: rgba(220, 38, 38, 0.2);
              --btn-sec-bg: #f1f5f9;
              --btn-sec-border: rgba(15, 23, 42, 0.12);
            }
          }
          body {
            margin: 0;
            background-color: var(--bg);
            color: var(--fg);
            font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justifyContent: space-between;
            padding: 1.25rem;
            box-sizing: border-box;
          }
        `,
          }}
        />
      </head>
      <body>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Logo />
        </header>

        <main
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem 1rem",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "32rem",
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              boxShadow:
                "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "2.5rem 2rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  marginBottom: "1rem",
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--dest-border)",
                  backgroundColor: "var(--dest-bg)",
                  color: "var(--dest)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AlertCircle size={28} strokeWidth={2} />
              </div>

              <div
                style={{
                  marginBottom: "0.75rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.25rem 0.625rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  backgroundColor: "var(--dest-bg)",
                  color: "var(--dest)",
                  border: "1px solid var(--dest-border)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: "var(--dest)",
                  }}
                />
                <span>خطأ في النظام</span>
              </div>

              <h1
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 700,
                  margin: "0 0 0.5rem 0",
                  color: "var(--fg)",
                }}
              >
                حدث خطأ غير متوقع
              </h1>

              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--muted)",
                  lineHeight: 1.6,
                  margin: "0 0 1rem 0",
                  maxWidth: "22rem",
                }}
              >
                واجهت المنصة مشكلة مؤقتة على مستوى النظام. يمكنك إعادة المحاولة
                أو العودة للرئيسية.
              </p>

              {error?.digest ? (
                <div
                  style={{
                    marginBottom: "1.25rem",
                    padding: "0.375rem 0.75rem",
                    borderRadius: "0.375rem",
                    backgroundColor: "rgba(148, 163, 184, 0.1)",
                    border: "1px solid var(--border)",
                    fontSize: "0.75rem",
                    fontFamily: "monospace",
                    color: "var(--muted)",
                    direction: "ltr",
                  }}
                >
                  رمز الخطأ:{" "}
                  <strong style={{ color: "var(--fg)" }}>
                    {error.digest}
                  </strong>
                </div>
              ) : null}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  justifyContent: "center",
                  width: "100%",
                  marginTop: "0.5rem",
                }}
              >
                <Link
                  href="/"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 1.25rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    backgroundColor: "var(--btn-sec-bg)",
                    color: "var(--fg)",
                    border: "1px solid var(--btn-sec-border)",
                    cursor: "pointer",
                  }}
                >
                  <Gauge size={16} />
                  العودة للوحة التحكم
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 1.25rem",
                    borderRadius: "0.5rem",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    backgroundColor: "var(--dest)",
                    color: "#ffffff",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={16} />
                  إعادة المحاولة
                </button>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--border)",
                padding: "0.75rem 1.5rem",
                textAlign: "center",
                fontSize: "0.75rem",
                color: "var(--muted)",
                backgroundColor: "rgba(148, 163, 184, 0.05)",
              }}
            >
              إذا استمرت المشكلة، شارك رمز الخطأ مع الدعم الفني.
            </div>
          </div>
        </main>

        <footer
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.5rem",
            padding: "0.5rem 0",
            fontSize: "0.75rem",
            color: "var(--muted)",
          }}
        >
          <span>جميع الحقوق محفوظة {year} ©</span>
          <a
            href="https://red-shadows-rs.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--muted)",
              textDecoration: "none",
            }}
          >
            <Image
              src="/red-shadows-logo.png"
              alt=""
              width={512}
              height={353}
              style={{ height: "1rem", width: "auto" }}
            />
            <span dir="ltr">RED SHADOWS | RS</span>
          </a>
        </footer>
      </body>
    </html>
  );
}
