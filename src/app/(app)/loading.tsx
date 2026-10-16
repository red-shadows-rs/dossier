import { PageHeaderSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function AppLoading() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeaderSkeleton hasAction={false} />
      <div className="rounded-xl border border-border/70 bg-card p-5 flex flex-col gap-3">
        <Skeleton className="h-6 w-48 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
          <Skeleton className="h-10 rounded" />
          <Skeleton className="h-10 rounded" />
        </div>
      </div>
    </div>
  );
}
