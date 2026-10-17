import clsx from "clsx";
import type { HTMLAttributes } from "react";

export function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded bg-muted/60 dark:bg-muted/40",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export function PageHeaderSkeleton({
  hasAction = true,
  actionWidth = "w-28",
}: {
  hasAction?: boolean;
  actionWidth?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
      <div className="flex items-center gap-3.5">
        <Skeleton className="h-10 w-10 rounded shrink-0" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-7 w-36 sm:w-48 rounded" />
        </div>
      </div>
      {hasAction ? (
        <Skeleton className={clsx("h-9 rounded shrink-0", actionWidth)} />
      ) : null}
    </div>
  );
}

export function TabsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-border pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-24 sm:w-28 rounded shrink-0" />
      ))}
    </div>
  );
}

export function ClientsTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton actionWidth="w-32" />
      <div className="rounded border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-36 rounded" />
        </div>
      </div>
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 hidden sm:block" />
          <Skeleton className="h-4 w-36 hidden md:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-4 w-20 hidden lg:block" />
          <Skeleton className="h-4 w-16 hidden sm:block" />
          <Skeleton className="h-4 w-16 ms-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1 max-w-[180px]">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
              <Skeleton className="h-4 w-36 hidden md:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <Skeleton className="h-4 w-20 hidden lg:block" />
              <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectsTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton actionWidth="w-36" />
      <div className="rounded border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40 flex-1" />
          <Skeleton className="h-4 w-32 hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-4 w-16 ms-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-5 w-20 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0 max-w-[220px]">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-32 hidden sm:block" />
              <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContractsTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton actionWidth="w-32" />
      <div className="rounded border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-44 flex-1" />
          <Skeleton className="h-4 w-28 hidden sm:block" />
          <Skeleton className="h-4 w-28 hidden md:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-4 w-16 ms-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-5 w-28 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0 max-w-[240px]">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-4 w-28 hidden sm:block" />
              <Skeleton className="h-4 w-28 hidden md:block" />
              <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InvoicesTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton actionWidth="w-36" />
      <div className="rounded border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <div className="flex flex-1 items-center gap-2 min-w-[240px]">
            <Skeleton className="h-10 flex-1 rounded" />
            <Skeleton className="h-10 w-20 rounded" />
          </div>
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-32 hidden sm:block" />
          <Skeleton className="h-4 w-32 hidden md:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-24 flex-1 text-end" />
          <Skeleton className="h-4 w-24 hidden lg:block text-end" />
          <Skeleton className="h-4 w-16 ms-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-5 w-28 rounded shrink-0" />
              <Skeleton className="h-4 w-32 hidden sm:block" />
              <Skeleton className="h-4 w-32 hidden md:block" />
              <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
              <Skeleton className="h-4 w-24 flex-1" />
              <Skeleton className="h-4 w-24 hidden lg:block" />
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TemplatesTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton actionWidth="w-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col justify-between h-44"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-3/4 rounded" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border/40">
              <Skeleton className="h-4 w-24" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function UsersTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton actionWidth="w-36" />
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-4 w-40 hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-24 hidden lg:block" />
          <Skeleton className="h-4 w-16 hidden sm:block" />
          <Skeleton className="h-4 w-16 ms-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <div className="flex items-center gap-2.5 flex-1 min-w-0 max-w-[200px]">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-4 w-40 hidden sm:block" />
              <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
              <Skeleton className="h-5 w-24 rounded-full hidden lg:block" />
              <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
              <div className="flex items-center gap-1.5 ms-auto shrink-0">
                <Skeleton className="h-7 w-7 rounded" />
                <Skeleton className="h-7 w-7 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AuditTableSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton hasAction={false} />
      <div className="rounded border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
          <Skeleton className="h-10 flex-1 min-w-[200px] rounded" />
          <Skeleton className="h-10 w-44 rounded" />
          <Skeleton className="h-10 w-28 rounded" />
          <Skeleton className="h-10 w-20 rounded" />
        </div>
      </div>
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-20 hidden md:block" />
          <Skeleton className="h-4 w-32 hidden md:block" />
          <Skeleton className="h-4 w-48 flex-1" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-28 shrink-0" />
              <Skeleton className="h-4 w-24 hidden sm:block" />
              <Skeleton className="h-5 w-20 rounded-full hidden md:block" />
              <Skeleton className="h-4 w-32 hidden md:block" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded" />
          <Skeleton className="h-9 w-28 rounded" />
        </div>
      </div>

      <TabsSkeleton count={5} />

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-5 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContractDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-56" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded" />
          <Skeleton className="h-9 w-28 rounded" />
        </div>
      </div>

      <TabsSkeleton count={4} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-5 w-40" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-col gap-3 pt-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function InvoiceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-40" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded" />
          <Skeleton className="h-9 w-28 rounded" />
          <Skeleton className="h-9 w-24 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded border border-border bg-card p-4 flex flex-col gap-2"
          >
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-28" />
          </div>
        ))}
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-8 w-24 rounded" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-3 gap-4">
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-24 text-end" />
            </div>
          ))}
        </div>
        <div className="ms-auto w-64 flex flex-col gap-2 pt-4 border-t border-border">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ClientDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded shrink-0" />
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-7 w-44" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded" />
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-4 w-36" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-4 w-36" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UserDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded shrink-0" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <Skeleton className="h-5 w-28" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3.5 w-20" />
                <Skeleton className="h-5 w-48" />
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
          <Skeleton className="h-5 w-32" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full rounded" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TemplateDetailSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded shrink-0" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="h-9 w-24 rounded" />
      </div>
      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

export function ContractEditSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded shrink-0" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-3.5 w-28" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded" />
      </div>

      <div className="grid grid-cols-5 gap-2 border-b border-border pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5 items-center text-center">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3 w-16 hidden sm:block" />
          </div>
        ))}
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-6 flex flex-col gap-5">
        <Skeleton className="h-5 w-36" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Skeleton className="h-10 w-24 rounded" />
          <Skeleton className="h-10 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-28 sm:w-36 rounded shrink-0" />
        ))}
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ))}
        </div>
        <div className="flex justify-end pt-3 border-t border-border">
          <Skeleton className="h-10 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}

export function AccountSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton hasAction={false} />

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded" />
          </div>
        </div>
        <Skeleton className="h-10 w-24 rounded ms-auto" />
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      <div className="rounded border border-border bg-card p-4 sm:p-5 flex flex-col gap-4">
        <Skeleton className="h-5 w-28" />
        <div className="flex flex-col gap-3 max-w-md">
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-full rounded" />
          <Skeleton className="h-10 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton({ fieldsCount = 6 }: { fieldsCount?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeaderSkeleton hasAction={false} />
      <div className="rounded border border-border bg-card p-4 sm:p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {Array.from({ length: fieldsCount }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full rounded" />
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <Skeleton className="h-10 w-24 rounded" />
          <Skeleton className="h-10 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <Skeleton className="h-10 w-10 rounded shrink-0" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-7 w-36 sm:w-48 rounded" />
            <Skeleton className="h-3.5 w-56 sm:w-72 rounded" />
          </div>
        </div>
      </div>

      {/* Finance Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded border border-border/80 bg-card p-3 sm:p-4 h-24 sm:h-28"
            >
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-16 sm:w-20 rounded" />
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded shrink-0" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-24 sm:w-28 rounded" />
                <Skeleton className="h-3 w-28 sm:w-36 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-24 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col justify-between rounded border border-border/80 bg-card p-3 sm:p-4 h-24 sm:h-28"
            >
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3 w-16 sm:w-20 rounded" />
                <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded shrink-0" />
              </div>
              <div className="flex flex-col gap-1">
                <Skeleton className="h-6 w-16 sm:w-20 rounded" />
                <Skeleton className="h-3 w-28 sm:w-32 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Activity Chart */}
      <div className="rounded border border-border/80 bg-card p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 pb-3 border-b border-border/40">
          <Skeleton className="h-7 w-7 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="h-56 flex items-end gap-3 pt-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <Skeleton
              key={idx}
              className="flex-1 rounded-t-sm"
              style={{ height: `${20 + ((idx * 13) % 70)}%` }}
            />
          ))}
        </div>
      </div>

      {/* Donut Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded border border-border/80 bg-card p-4 sm:p-5 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border/40">
              <Skeleton className="h-4 w-32 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="flex items-center justify-center py-6">
              <Skeleton className="h-36 w-36 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Attention Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 pt-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>

        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded border border-border/80 bg-card shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-36 rounded" />
              </div>
              <Skeleton className="h-5 w-12 rounded" />
            </div>
            <div className="divide-y divide-border/60 px-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between py-3 gap-4">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-36 rounded hidden sm:block" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DocumentSkeleton({
  withToolbar = false,
  className,
}: {
  withToolbar?: boolean;
  className?: string;
} = {}) {
  return (
    <div className="relative flex flex-col gap-4">
      {withToolbar ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24 rounded" />
            <Skeleton className="h-9 w-24 rounded" />
          </div>
          <Skeleton className="h-9 w-28 rounded" />
        </div>
      ) : null}
      <div
        className={clsx(
          "relative h-[44rem] w-full rounded border border-border bg-card/60 p-6 sm:p-10 flex flex-col gap-6 overflow-hidden shadow-sm",
          className,
        )}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/50 backdrop-blur-[1px] z-10">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-foreground">جار التحميل...</span>
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-12 w-28 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-8 pt-4 border-t border-border/40">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col gap-2 items-end">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-4">
          <Skeleton className="h-8 w-full rounded" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <div className="ms-auto w-64 flex flex-col gap-2 pt-6">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="flex justify-between pt-2 border-t border-border">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableSkeleton({ rowsCount: _rowsCount = 6 }: { rowsCount?: number } = {}) {
  return <ClientsTableSkeleton />;
}
export function DetailSkeleton() {
  return <ProjectDetailSkeleton />;
}
