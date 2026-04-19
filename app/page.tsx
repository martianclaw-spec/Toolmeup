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
    <main className="flex flex-col">
      {/* Hero */}
      <section className="border-b border-neutral-200 bg-gradient-to-b from-amber-50 to-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-12 sm:py-16">
          <div className="flex flex-col gap-4">
            <span className="w-fit rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700">
              Neighbor-to-neighbor tool rental
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
              Tools when you need them.
              <br className="hidden sm:block" />{" "}
              <span className="text-amber-600">From the pros next door.</span>
            </h1>
            <p className="max-w-2xl text-base text-neutral-700 sm:text-lg">
              Rent drills, saws, ladders, and more by the day — from
              contractors, handymen, and neighbors in your city. Pickup,
              meetup, or delivery. Pay only for the days you need it.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#listings"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
            >
              Browse tools
            </a>
            <Link
              href="/listings/new"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              List a tool
              <span aria-hidden className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-neutral-200 bg-white">
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-4 py-6 sm:grid-cols-3 sm:gap-6">
          <li className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Any trade
            </span>
            <span className="text-sm text-neutral-700">
              Drills to jackhammers, ladders to lasers — listed by people
              who actually use them.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              By the day
            </span>
            <span className="text-sm text-neutral-700">
              Transparent daily rates. Pay only for the days you use it,
              with the quote frozen at request time.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Your call
            </span>
            <span className="text-sm text-neutral-700">
              Pickup, meetup at a spot that works, or delivery right to
              the jobsite.
            </span>
          </li>
        </ul>
      </section>

      {/* Listings + search */}
      <section id="listings" className="mx-auto w-full max-w-5xl px-4 py-10">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Find a tool
          </h2>
          <p className="text-sm text-neutral-600">
            Search by keyword, filter by city or handoff, and sort by daily
            rate.
          </p>
        </div>

        <form
          method="get"
          className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800 lg:col-span-2">
              Keyword
              <input
                name="q"
                type="search"
                defaultValue={keyword ?? ""}
                placeholder="drill, ladder, saw…"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              Category
              <select
                name="category"
                defaultValue={categorySlug ?? ""}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="">Any category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              City
              <input
                name="city"
                type="text"
                defaultValue={city ?? ""}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              Handoff
              <select
                name="handoff"
                defaultValue={handoffRaw ?? ""}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="">Any handoff</option>
                <option value="pickup">Pickup</option>
                <option value="meetup">Meetup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              Max $/day
              <input
                name="maxRate"
                type="number"
                min="0"
                step="0.01"
                defaultValue={maxRateRaw ?? ""}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 font-normal text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
            <div className="flex flex-wrap items-end gap-3 lg:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-neutral-900 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
              >
                Search
              </button>
              {hasFilters && (
                <Link
                  href="/"
                  className="text-sm text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
                >
                  Clear filters
                </Link>
              )}
            </div>
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
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <p className="text-sm text-neutral-700">
              {hasFilters ? (
                <>
                  No listings match these filters.{" "}
                  <Link href="/" className="font-medium underline underline-offset-2">
                    Clear filters
                  </Link>{" "}
                  or{" "}
                  <Link
                    href="/listings/new"
                    className="font-medium underline underline-offset-2"
                  >
                    list your own tool
                  </Link>
                  .
                </>
              ) : (
                <>
                  No listings yet.{" "}
                  <Link
                    href="/listings/new"
                    className="font-medium underline underline-offset-2"
                  >
                    List the first tool
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        ) : isPagePastEnd ? (
          <p className="text-sm text-neutral-600">
            This page is empty.{" "}
            <Link href={urlForPage(1)} className="underline underline-offset-2">
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
                    className="flex h-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-neutral-900 hover:shadow-md"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="text-base font-semibold text-neutral-900">
                        {l.title}
                      </h3>
                      <span className="whitespace-nowrap text-sm font-bold text-amber-700">
                        ${l.dailyRate.toFixed(2)}
                        <span className="font-medium text-neutral-500">
                          /day
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {CONDITION_LABEL[l.condition]} · {l.city}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1 pt-2">
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
      </section>

      {/* Supply-side CTA */}
      <section className="border-t border-neutral-200 bg-neutral-900">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:py-12">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Got tools sitting in the truck?
            </h2>
            <p className="text-sm text-neutral-300 sm:text-base">
              Turn idle gear into income. List in minutes, set your own rate,
              approve every rental.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            List a tool
            <span aria-hidden className="ml-2">→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function HandoffBadge({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700">
      {label}
    </span>
  );
}
