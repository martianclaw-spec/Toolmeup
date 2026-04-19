import Link from "next/link";
import { prisma } from "@/lib/db";
import { getListings } from "@/server/listings";
import {
  DEFAULT_PAGE_SIZE,
  pageHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination";

const CONDITION_LABEL = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
} as const;

const HANDOFF_URL_TO_ENUM: Record<
  string,
  "PICKUP" | "MEETUP" | "DELIVERY"
> = {
  pickup: "PICKUP",
  meetup: "MEETUP",
  delivery: "DELIVERY",
};

const HANDOFF_ENUM_LABEL = {
  PICKUP: "Pickup",
  MEETUP: "Meetup",
  DELIVERY: "Delivery",
} as const;

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;

  const keyword = str(params.q);
  const categorySlug = str(params.category);
  const city = str(params.city);
  const handoffRaw = str(params.handoff)?.toLowerCase();
  const handoff = handoffRaw ? HANDOFF_URL_TO_ENUM[handoffRaw] : undefined;
  const maxRateRaw = str(params.maxRate);
  const maxRateNum = maxRateRaw ? Number(maxRateRaw) : undefined;
  const maxDailyRate =
    maxRateNum !== undefined &&
    Number.isFinite(maxRateNum) &&
    maxRateNum > 0
      ? maxRateNum
      : undefined;

  const requestedPage = parsePage(str(params.page));

  const [categories, result] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true },
    }),
    getListings(
      { keyword, categorySlug, city, handoff, maxDailyRate },
      { page: requestedPage, pageSize: DEFAULT_PAGE_SIZE },
    ),
  ]);

  const { items: listings, total, page: currentPage, pageSize } = result;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Page went past the end: we keep currentPage (the user's requested value
  // clamped to >= 1) for the URL display, and show an "empty page" message.
  const isPagePastEnd = total > 0 && currentPage > totalPages;

  const activeCategoryName = categorySlug
    ? categories.find((c) => c.slug === categorySlug)?.name
    : undefined;

  const activeLabels: string[] = [];
  if (keyword) activeLabels.push(`keyword "${keyword}"`);
  if (activeCategoryName) activeLabels.push(`category: ${activeCategoryName}`);
  if (city) activeLabels.push(`city: ${city}`);
  if (handoff) activeLabels.push(`handoff: ${HANDOFF_ENUM_LABEL[handoff]}`);
  if (maxDailyRate !== undefined) {
    activeLabels.push(`max $${maxDailyRate.toFixed(2)}/day`);
  }
  const hasFilters = activeLabels.length > 0;

  function urlForPage(target: number) {
    return pageHref("/", target, {
      q: keyword,
      category: categorySlug,
      city,
      handoff: handoffRaw,
      maxRate: maxRateRaw,
    });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Find tools nearby.
        </h1>
        <p className="text-base text-neutral-600">
          Borrow or rent equipment from neighbors and pros across every
          trade — pickup, meetup, or delivery.
        </p>
        <p className="text-sm text-neutral-500">
          Have a tool to share?{" "}
          <Link
            href="/listings/new"
            className="underline underline-offset-2"
          >
            List a tool
          </Link>
          .
        </p>
      </header>

      <form
        method="get"
        className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <label className="flex flex-col gap-1 text-sm lg:col-span-2">
          Keyword
          <input
            name="q"
            type="search"
            defaultValue={keyword ?? ""}
            placeholder="drill, ladder, saw…"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            name="category"
            defaultValue={categorySlug ?? ""}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            <option value="">Any category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          City
          <input
            name="city"
            type="text"
            defaultValue={city ?? ""}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Handoff
          <select
            name="handoff"
            defaultValue={handoffRaw ?? ""}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            <option value="">Any handoff</option>
            <option value="pickup">Pickup</option>
            <option value="meetup">Meetup</option>
            <option value="delivery">Delivery</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Max $/day
          <input
            name="maxRate"
            type="number"
            min="0"
            step="0.01"
            defaultValue={maxRateRaw ?? ""}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <div className="flex items-end gap-3 lg:col-span-2">
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Search
          </button>
          {hasFilters && (
            <Link
              href="/"
              className="text-sm text-neutral-600 underline underline-offset-2"
            >
              Clear filters
            </Link>
          )}
        </div>
      </form>

      {hasFilters && (
        <p className="mb-2 text-xs text-neutral-500">
          Filtering by {activeLabels.join(", ")}.
        </p>
      )}

      {total > 0 && (
        <p className="mb-4 text-xs text-neutral-500">
          {total} {total === 1 ? "listing" : "listings"}
          {totalPages > 1 && (
            <>
              {" "}
              · page {Math.min(currentPage, totalPages)} of {totalPages}
            </>
          )}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-neutral-600">
          {hasFilters ? (
            <>
              No listings match these filters.{" "}
              <Link href="/" className="underline">
                Clear filters
              </Link>{" "}
              or{" "}
              <Link href="/listings/new" className="underline">
                list your own tool
              </Link>
              .
            </>
          ) : (
            <>
              No listings yet.{" "}
              <Link href="/listings/new" className="underline">
                List the first tool
              </Link>
              .
            </>
          )}
        </p>
      ) : isPagePastEnd ? (
        <p className="text-sm text-neutral-600">
          This page is empty.{" "}
          <Link href={urlForPage(1)} className="underline">
            Go to page 1
          </Link>
          .
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l) => (
              <li key={l.id}>
                <Link
                  href={`/listings/${l.id}`}
                  className="flex h-full flex-col gap-2 rounded border border-neutral-200 p-4 hover:border-neutral-400"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-base font-medium">{l.title}</h2>
                    <span className="whitespace-nowrap text-sm font-medium">
                      ${l.dailyRate.toFixed(2)}/day
                    </span>
                  </div>
                  <p className="text-sm text-neutral-600">
                    {CONDITION_LABEL[l.condition]} · {l.city}
                  </p>
                  <div className="mt-auto flex flex-wrap gap-1 pt-1">
                    {l.pickupEnabled && <HandoffBadge label="Pickup" />}
                    {l.meetupEnabled && <HandoffBadge label="Meetup" />}
                    {l.deliveryEnabled && <HandoffBadge label="Delivery" />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <PaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            hrefFor={urlForPage}
          />
        </>
      )}
    </main>
  );
}

function HandoffBadge({ label }: { label: string }) {
  return (
    <span className="rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700">
      {label}
    </span>
  );
}
