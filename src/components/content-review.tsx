import { REVIEW_DATE, TAB_REVIEWS, type ReviewTab } from "@/lib/content-review";

export function ContentReview({ tab }: { tab: ReviewTab }) {
  const review = TAB_REVIEWS[tab];
  return (
    <details className="rounded-lg border bg-card p-3" data-content-review={tab}>
      <summary className="cursor-pointer text-sm font-semibold">Documentation review · {REVIEW_DATE}</summary>
      <p className="mt-2 text-xs text-muted-foreground">Reference guidance, not a test of a customer tenant’s licenses, configuration or enforcement.</p>
      <ul className="mt-3 flex list-disc flex-col gap-2 pl-4 text-sm leading-relaxed text-muted-foreground">
        {review.limits.map((limit) => <li key={limit}>{limit}</li>)}
      </ul>
      <ul className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2" aria-label="Documentation review sources">
        {review.sources.map((source) => <li key={source.href}><a href={source.href} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary underline underline-offset-4">{source.label}</a></li>)}
      </ul>
    </details>
  );
}
