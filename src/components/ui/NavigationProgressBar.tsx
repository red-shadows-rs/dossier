"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(100);
    const timer = setTimeout(() => {
      setNavigating(false);
      setProgress(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("http://") ||
        href.startsWith("https://") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        anchor.target === "_blank" ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const currentUrl = window.location.pathname + window.location.search;
      if (href === currentUrl) return;

      setNavigating(true);
      setProgress(20);
    };

    const handlePopState = () => {
      setNavigating(true);
      setProgress(30);
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!navigating) return;

    const t1 = setTimeout(() => {
      setProgress((p) => (p < 60 ? 60 : p));
    }, 120);

    const t2 = setTimeout(() => {
      setProgress((p) => (p < 85 ? 85 : p));
    }, 350);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [navigating]);

  if (!navigating && progress === 0) return null;

  return (
    <div
      role="progressbar"
      aria-label="Navigation Progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      className="fixed inset-x-0 top-0 z-[9999] h-0.5 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-primary transition-all duration-200 ease-out shadow-[0_0_8px_var(--primary)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
