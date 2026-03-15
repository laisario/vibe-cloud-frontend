import { Skeleton } from "@/components/ui/skeleton";

const PreviewSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    ))}
  </div>
);

export default PreviewSkeleton;
