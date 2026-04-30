import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getListings } from "@/server/listings";
import {
  DEFAULT_PAGE_SIZE,
  pageHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination";

// Canonical site URL. Update if your production domain changes
// (e.g. when attaching a custom domain in Vercel).
const SITE_URL = "https://toolmeup.vercel.app";

export const metadata: Metadata = {
  title: {
    absolute: "Rent tools near you | Toolmeup",
  },
  description:
    "Rent drills, saws, ladders, and more from neighbors in your city. Pay by the day — pickup, meetup, or delivery. Or earn by listing the tools in your garage.",
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    siteName: "Toolmeup",
    url: SITE_URL,
    title: "Rent tools near you | Toolmeup",
    description:
      "A local tool rental marketplace. Rent tools by the day from neighbors in your city, or earn by listing the tools you already own.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rent tools near you | Toolmeup",
    description:
      "A local tool rental marketplace. Rent tools by the day from neighbors in your city, or earn by listing the tools you already own.",
  },
};

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
      <section className="border-b border-neutral-200 bg-gradient-to-b from-amber-50 via-amber-50/40 to-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-7 px-4 py-14 sm:py-20">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700">
              A faster way to rent tools, locally
            </span>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-neutral-900 sm:text-5xl md:text-6xl">
              Get the tool you need nearby —
              <br />
              <span className="text-amber-600">without buying it.</span>
            </h1>
            <p className="max-w-2xl text-base text-neutral-700 sm:text-lg">
              toolmeup helps you rent tools from people in your area by the
              day. Search, request, pick up, or get it delivered.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#search"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
            >
              Find tools near me
            </a>
            <Link
              href="/listings/new"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              List your tools
              <span aria-hidden className="ml-2">→</span>
            </Link>
          </div>

          {/* Trust line + speed-focused supporting line */}
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-neutral-700">
              Rent from people in your area — not strangers across the
              internet.
            </p>
            <p className="text-xs text-neutral-500">
              Find tools in minutes · Request and pick up same day · Pickup,
              meetup, or delivery
            </p>
            <ul className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1.5">
              <CompareItem>Cheaper than hardware store rentals</CompareItem>
              <CompareItem>Closer than driving across town</CompareItem>
              <CompareItem>
                Available from people in your neighborhood
              </CompareItem>
            </ul>
          </div>
        </div>
      </section>

      {/* Real-life moments */}
      <section className="border-b border-neutral-200 bg-neutral-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-12">
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            <Moment q="Building a deck this weekend?">
              Borrow a circular saw from someone three blocks away.
            </Moment>
            <Moment q="Need a pressure washer for one day?">
              There&apos;s probably one two streets over.
            </Moment>
            <Moment q="Fixing something at home and missing one tool?">
              Whatever you&apos;re short, someone nearby has it.
            </Moment>
            <Moment q="Helping a friend move and short a furniture dolly?">
              Find one in your neighborhood. Pick it up on the way.
            </Moment>
          </ul>
        </div>
      </section>

      {/* Search + listings */}
      <section
        id="search"
        className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-12"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <span
                aria-hidden
                className="inline-block h-2 w-2 rounded-full bg-amber-500"
              />
              Tools available nearby — check your area
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Find a tool
            </h2>
            <p className="text-sm text-neutral-600">
              Search by keyword, narrow by city, category, or handoff.
            </p>
            {city && (
              <p className="text-sm font-medium text-neutral-900">
                Showing tools near{" "}
                <span className="text-amber-700">{city}</span>.
              </p>
            )}
          </div>
          {total > 10 && (
            <p className="text-xs text-neutral-400">
              {total} tools available
              {totalPages > 1 && (
                <>
                  {" "}
                  · page {Math.min(currentPage, totalPages)} of {totalPages}
                </>
              )}
            </p>
          )}
        </div>

        <form
          method="get"
          className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
        >
          {/* Primary search row — keyword + city + go */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              What do you need?
              <input
                name="q"
                type="search"
                defaultValue={keyword ?? ""}
                placeholder="drill, ladder, pressure washer…"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800">
              City
              <input
                name="city"
                type="text"
                defaultValue={city ?? ""}
                placeholder="Your city"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2.5 font-normal text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                className="h-[42px] w-full rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 sm:w-auto"
              >
                Search
              </button>
            </div>
          </div>

          {/* Secondary filters — collapsed-feeling row */}
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Category
              <select
                name="category"
                defaultValue={categorySlug ?? ""}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="">Any category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Handoff
              <select
                name="handoff"
                defaultValue={handoffRaw ?? ""}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="">Any handoff</option>
                <option value="pickup">Pickup</option>
                <option value="meetup">Meetup</option>
                <option value="delivery">Delivery</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm text-neutral-700">
              Max $/day
              <input
                name="maxRate"
                type="number"
                min="0"
                step="0.01"
                defaultValue={maxRateRaw ?? ""}
                placeholder="No limit"
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
            </label>
          </div>

          {hasFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
              <span>Filtering by {activeLabels.join(", ")}.</span>
              <Link
                href="/"
                className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900"
              >
                Clear filters
              </Link>
            </div>
          )}
        </form>

        <p className="mb-4 text-xs text-neutral-500">
          No commitment — request first, pay after approval.
        </p>

        {/* Example searches — clickable chips. Use the same ?q= URL
            contract as the form so behavior is identical. */}
        <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-neutral-500">Try:</span>
          <Chip q="drill">Drill</Chip>
          <Chip q="pressure washer">Pressure washer</Chip>
          <Chip q="ladder">Ladder</Chip>
          <Chip q="sander">Sander</Chip>
          <Chip q="tile saw">Tile saw</Chip>
        </div>

        {total === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
            <p className="text-base font-semibold text-neutral-900">
              {hasFilters
                ? "No tools match your search yet."
                : "Be one of the first."}
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-neutral-600">
              {hasFilters ? (
                <>
                  Try a broader search or{" "}
                  <Link
                    href="/"
                    className="font-medium text-neutral-900 underline underline-offset-2"
                  >
                    clear your filters
                  </Link>
                  .
                </>
              ) : (
                <>
                  No tools listed in your area yet — list one of yours and
                  start earning, or check back as the marketplace grows.
                </>
              )}
            </p>
            <Link
              href="/listings/new"
              className="mt-4 inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-amber-400"
            >
              List your tool
              <span aria-hidden className="ml-1.5">→</span>
            </Link>
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
              {listings.map((l, i) => {
                // Listings are already ordered newest-first by getListings,
                // so the first few on page 1 are the most recently added.
                // Purely positional — no extra DB read needed.
                const isRecent = currentPage === 1 && i < 3;
                return (
                  <li key={l.id}>
                    <Link
                      href={`/listings/${l.id}`}
                      className="group flex h-full flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold leading-snug text-neutral-900 group-hover:text-neutral-900">
                          {l.title}
                          {isRecent && (
                            <span className="ml-2 inline-block rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                              New
                            </span>
                          )}
                        </h3>
                        <span className="shrink-0 whitespace-nowrap text-right">
                          <span className="text-lg font-extrabold tracking-tight text-amber-700">
                            ${l.dailyRate.toFixed(2)}
                          </span>
                          <span className="ml-0.5 text-xs font-medium text-neutral-500">
                            /day
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-neutral-600">
                        <span className="inline-flex items-center gap-1">
                          <span aria-hidden>📍</span>
                          {l.city}
                        </span>
                        <span aria-hidden className="text-neutral-300">·</span>
                        <span>{CONDITION_LABEL[l.condition]}</span>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                        {l.pickupEnabled && <HandoffBadge label="Pickup" />}
                        {l.meetupEnabled && <HandoffBadge label="Meetup" />}
                        {l.deliveryEnabled && <HandoffBadge label="Delivery" />}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>

            <PaginationNav
              currentPage={currentPage}
              totalPages={totalPages}
              hrefFor={urlForPage}
            />
          </>
        )}
      </section>

      {/* How it works */}
      <section className="border-t border-neutral-200 bg-neutral-50">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-14">
          <div className="mb-8 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              How it works
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              From search to return in four steps
            </h2>
          </div>
          <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Step n={1} title="Search for a tool">
              Find what you need by keyword, city, or category.
            </Step>
            <Step n={2} title="Send a rental request">
              Pick your dates, choose handoff, message the owner.
            </Step>
            <Step n={3} title="Pick up, meet, or get delivery">
              Coordinate locally — pickup, public meetup, or delivery.
            </Step>
            <Step n={4} title="Return it when you're done">
              Drop it back, leave a review, you&apos;re done.
            </Step>
          </ol>
        </div>
      </section>

      {/* Trust / value */}
      <section className="border-t border-neutral-200 bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:py-14">
          <div className="mb-8 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
              Why toolmeup
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
              Built around local trust
            </h2>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ValueItem title="Owner approves every request">
              Nothing is rented without the owner saying yes — you&apos;re
              always in control of your tools.
            </ValueItem>
            <ValueItem title="Local pickup, meetup, or delivery">
              Coordinate the way that works for you and the owner. No shipping,
              no warehouses.
            </ValueItem>
            <ValueItem title="Reviews after every rental">
              Renters and owners review each other after a completed rental, so
              the community keeps itself honest.
            </ValueItem>
            <ValueItem title="Save money on tools you only need once">
              Skip the hardware-store markup. Pay for the days you use it,
              nothing more.
            </ValueItem>
          </ul>
        </div>
      </section>

      {/* Supply-side CTA */}
      <section className="border-t border-neutral-200 bg-neutral-900">
        <div className="mx-auto flex max-w-5xl flex-col items-start gap-4 px-4 py-12 sm:flex-row sm:items-center sm:justify-between sm:py-14">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Have tools you rarely use?
            </h2>
            <p className="text-sm text-neutral-300 sm:text-base">
              Rent them out to neighbors. Set your own price, pick your
              availability, approve every request.
            </p>
          </div>
          <Link
            href="/listings/new"
            className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            List your tools
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

function Moment({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1.5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <span className="text-sm font-semibold leading-snug text-neutral-900">
        {q}
      </span>
      <span className="text-sm leading-snug text-neutral-600">{children}</span>
    </li>
  );
}

function Chip({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}) {
  // Hash to #search keeps the user at the search section after the
  // request, instead of landing back at the top of the homepage.
  return (
    <Link
      href={`/?q=${encodeURIComponent(q)}#search`}
      className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-xs font-medium text-neutral-800 transition-colors hover:border-neutral-900 hover:text-neutral-900"
    >
      {children}
    </Link>
  );
}

function CompareItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-1.5 text-sm text-neutral-700">
      <span aria-hidden className="mt-0.5 font-bold text-amber-600">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-5">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-sm font-extrabold text-neutral-900">
        {n}
      </span>
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="text-sm text-neutral-600">{children}</p>
    </li>
  );
}

function ValueItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex flex-col gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-5">
      <h3 className="text-base font-semibold text-neutral-900">{title}</h3>
      <p className="text-sm text-neutral-600">{children}</p>
    </li>
  );
}
