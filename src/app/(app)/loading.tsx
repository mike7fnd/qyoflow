import { Page } from "@/components/app/page-header";
import { Skeleton } from "@/components/ui";

/**
 * A rough portrait of the page that's coming, not a spinner: a title, a large
 * figure, and a few rows. Held still — an animated placeholder for a 200ms wait
 * is more distracting than the wait.
 */
export default function Loading() {
  return (
    <Page>
      <div className="mb-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-40" />
      </div>

      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-20 w-44" />

      <div className="mt-12 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </Page>
  );
}
