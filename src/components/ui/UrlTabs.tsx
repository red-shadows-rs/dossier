// Dossier - Url Tabs Ui Component
// https://github.com/red-shadows-rs/dossier

"use client";

import React, { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/components/ui/cn";

export interface UrlTabItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number | string }>;
  badge?: React.ReactNode;
}


interface UrlTabsInnerProps {
  tabs: UrlTabItem[];
  defaultTab?: string;
  paramName?: string;
  activeTab?: string;
  onChange?: (id: string) => void;
  className?: string;
}

function UrlTabsInner({
  tabs,
  defaultTab,
  paramName = "tab",
  activeTab: controlledActiveTab,
  onChange,
  className,
}: UrlTabsInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab =
    controlledActiveTab ||
    searchParams.get(paramName) ||
    defaultTab ||
    tabs[0]?.id ||
    "";

  const handleSelectTab = useCallback(
    (tabId: string) => {
      if (onChange) {
        onChange(tabId);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramName, tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, paramName, onChange],
  );

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-border/60 overflow-x-auto no-scrollbar",
        className,
      )}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === currentTab;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleSelectTab(tab.id)}
            className={cn(
              "group relative inline-flex items-center gap-2 px-3.5 py-2.5 text-xs sm:text-sm font-medium transition-all duration-150 border-b-2 -mb-px whitespace-nowrap",
              isActive
                ? "border-primary text-primary font-semibold bg-primary/5 rounded-t-md"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-t-md",
            )}
          >
            {Icon && (
              <Icon
                size={16}
                className={cn(
                  "shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
            )}
            <span>{tab.label}</span>
            {tab.badge !== undefined && tab.badge !== null && (
              <span
                className={cn(
                  "ms-1 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-mono leading-none",
                  isActive
                    ? "bg-primary/15 text-primary font-bold"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function UrlTabs(props: UrlTabsInnerProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-1 border-b border-border/60 pb-px">
          {props.tabs.map((tab) => (
            <div
              key={tab.id}
              className="px-3.5 py-2.5 text-xs text-muted-foreground opacity-60"
            >
              {tab.label}
            </div>
          ))}
        </div>
      }
    >
      <UrlTabsInner {...props} />
    </Suspense>
  );
}
