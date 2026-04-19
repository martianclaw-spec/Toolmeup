import Link from "next/link";

// Simple pagination nav: Previous / "Page X of Y" / Next.
// Renders nothing when totalPages <= 1. Previous/Next become disabled
// spans (styled dim, aria-disabled) at the endpoints so keyboard users
// can't tab into dead links.
export function PaginationNav({
  currentPage,
  totalPages,
  hrefFor,
}: {
  currentPage: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center justify-between gap-4 text-sm"
    >
      {currentPage > 1 ? (
        <Link
          href={hrefFor(currentPage - 1)}
          className="rounded border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800"
        >
          ← Previous
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="rounded border border-neutral-200 px-3 py-1.5 text-neutral-400"
        >
          ← Previous
        </span>
      )}

      <span className="text-neutral-600">
        Page {currentPage} of {totalPages}
      </span>

      {currentPage < totalPages ? (
        <Link
          href={hrefFor(currentPage + 1)}
          className="rounded border border-neutral-300 px-3 py-1.5 font-medium text-neutral-800"
        >
          Next →
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="rounded border border-neutral-200 px-3 py-1.5 text-neutral-400"
        >
          Next →
        </span>
      )}
    </nav>
  );
}
