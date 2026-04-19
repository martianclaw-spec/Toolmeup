export const DEFAULT_PAGE_SIZE = 12;

export type PaginationInput = {
  page?: number;
  pageSize?: number;
};

// Parse a ?page= search-param value. Any non-numeric, zero, negative, or
// missing value collapses to page 1 — never throw on user input.
export function parsePage(raw: unknown): number {
  if (typeof raw !== "string" || !raw) return 1;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

// Normalize a server-function pagination input into page + pageSize +
// ready-to-use skip/take for Prisma. Callers just spread these into their
// findMany call.
export function resolvePagination(input: PaginationInput | undefined) {
  const page = Math.max(1, Math.floor(input?.page ?? 1));
  const pageSize = Math.max(
    1,
    Math.floor(input?.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

// Build a URL for a specific page while preserving any other search
// params the caller passes. Page 1 is omitted so the first-page URL
// stays canonical (no duplicate `/?page=1` vs `/`).
export function pageHref(
  basePath: string,
  page: number,
  extraParams?: Record<string, string | undefined>,
): string {
  const sp = new URLSearchParams();
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (v) sp.set(k, v);
    }
  }
  if (page > 1) sp.set("page", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}
