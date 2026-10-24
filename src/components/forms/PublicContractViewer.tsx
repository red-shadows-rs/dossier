// Dossier - Public Contract Viewer Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useEffect, useRef, useState } from "react";

export function PublicContractViewer({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState<number>(1200);

  const adjustHeight = () => {
    try {
      const frame = iframeRef.current;
      if (frame?.contentDocument?.documentElement) {
        const doc = frame.contentDocument;
        if (doc.body) {
          doc.body.style.overflow = "hidden";
        }
        const pages = Array.from(doc.querySelectorAll<HTMLElement>(".contract-page, .invoice-page"));
        let h = 0;
        if (pages.length > 0) {
          const lastPage = pages[pages.length - 1];
          const lastBar = lastPage?.querySelector<HTMLElement>(".bottom-red-bar");
          const target = lastBar || lastPage;
          if (target) {
            h = Math.ceil(target.getBoundingClientRect().bottom + (doc.defaultView?.scrollY ?? 0));
          }
        }
        if (!h || h < 200) {
          h = Math.max(
            doc.documentElement.scrollHeight,
            doc.body?.scrollHeight ?? 0,
            doc.documentElement.offsetHeight,
          );
        }
        if (h > 200) {
          setIframeHeight(h);
        }
      }
    } catch {
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [html]);

  return (
    <div className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin] rounded-xl border border-border/80 bg-white shadow-2xs">
      <iframe
        ref={iframeRef}
        title={title}
        sandbox="allow-same-origin"
        srcDoc={html}
        scrolling="no"
        onLoad={(e) => {
          adjustHeight();
          const frame = e.currentTarget;
          frame.contentDocument?.fonts?.ready?.then(adjustHeight);
          setTimeout(adjustHeight, 200);
          setTimeout(adjustHeight, 800);
        }}
        style={{ height: `${iframeHeight}px` }}
        className="w-full min-w-[700px] sm:min-w-full border-0 bg-white transition-all duration-200 block"
      />
    </div>
  );
}

