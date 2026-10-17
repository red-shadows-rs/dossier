import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <PageHeaderSkeleton actionWidth="w-28" />
      <div className="rounded border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-10 flex-1 min-w-[200px] rounded" />
          <Skeleton className="h-10 w-24 rounded" />
        </div>
      </div>
      <div className="rounded border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-4 py-3.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40 flex-1" />
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-4 w-16 ms-auto" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5">
              <Skeleton className="h-8 w-8 rounded shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1 min-w-0 max-w-[220px]">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-4 w-24 hidden sm:block" />
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

