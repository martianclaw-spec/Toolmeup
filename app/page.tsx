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
    // `absolute` bypasses the layout's title template so the homepage
    // renders the SEO title verbatim instead of "… · toolmeup".
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
      <section className="border-b border-neutral-200 bg-gradient-to-b from-amber-50 to-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-14 sm:py-20">
          <div className="flex flex-col gap-5">
            <span className="w-fit rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700">
              A local tool rental marketplace
            </span>
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 sm:text-5xl">
              Rent tools from people nearby.
              <br className="hidden sm:block" />{" "}
              <span className="text-amber-600">
                Or earn from the ones in your garage.
              </span>
            </h1>
            <p className="max-w-2xl text-base text-neutral-700 sm:text-lg">
              Whether you&apos;re tackling a weekend project or renting out the
              tools you already own, toolmeup connects you with people in your
              neighborhood. Rent by the day. Skip the hardware store.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="#listings"
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-colors hover:bg-amber-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
            >
              Find tools near you
            </a>
            <Link
              href="/listings/new"
              className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition-colors hover:border-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2"
            >
              List your tools
              <span aria-hidden className="ml-2">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-neutral-200 bg-white">
        <ul className="mx-auto grid max-w-5xl grid-cols-1 gap-5 px-4 py-8 sm:grid-cols-3 sm:gap-6">
          <li className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-neutral-900">
              Rent from people near you
            </span>
            <span className="text-sm text-neutral-600">
              Pickup, meetup, or delivery — right in your city.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-neutral-900">
              Perfect for weekend projects
            </span>
            <span className="text-sm text-neutral-600">
              Get the right tool for the job, just for the days you need it.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-neutral-900">
              Skip buying expensive tools
            </span>
            <span className="text-sm text-neutral-600">
              Save hundreds — borrow it once, or try it before you buy.
            </span>
          </li>
        </ul>
      </section>

      {/* Listings + search */}
      <section id="listings" className="mx-auto w-full max-w-5xl px-4 py-10 sm:py-12">
        <div className="mb-6 flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
            Find a tool
          </h2>
          <p className="text-sm text-neutral-600">
            Search by keyword, narrow by city, category, or handoff, and set a
            daily budget.
          </p>
        </div>

        <form
          method="get"
          className="mb-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm font-medium text-neutral-800 lg:col-span-2">
              What do you need?
              <input
                name="q"
                type="search"
                defaultValue={keyword ?? ""}
                placeholder="drill, ladder, pressure washer…"
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
                placeholder="Your city"
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
                Search tools
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
            {total} {total === 1 ? "tool" : "tools"} available
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
                  No tools match your search.{" "}
                  <Link
                    href="/"
                    className="font-medium underline underline-offset-2"
                  >
                    Clear filters
                  </Link>{" "}
                  and try again, or{" "}
                  <Link
                    href="/listings/new"
                    className="font-medium underline underline-offset-2"
                  >
                    list one of your own
                  </Link>
                  .
                </>
              ) : (
                <>
                  No tools listed yet —{" "}
                  <Link
                    href="/listings/new"
                    className="font-medium underline underline-offset-2"
                  >
                    be the first to share yours
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
                    className="flex h-full flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-400 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold leading-snug text-neutral-900">
                        {l.title}
                      </h3>
                      <span className="shrink-0 whitespace-nowrap text-sm font-bold text-amber-700">
                        ${l.dailyRate.toFixed(2)}
                        <span className="font-medium text-neutral-500">
                          /day
                        </span>
                      </span>
                    </div>
                    <p className="text-sm text-neutral-600">
                      {CONDITION_LABEL[l.condition]} · in {l.city}
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
