import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  deleteListing,
  getListingsForOwner,
  ListingError,
  pauseListing,
  unpauseListing,
} from "@/server/listings";
import {
  DEFAULT_PAGE_SIZE,
  pageHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination";
import { ListingStatusBadge } from "@/components/status-badge";

const CONDITION_LABEL = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
} as const;

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { error } = params;
  const requestedPage = parsePage(params.page);
  const {
    items: listings,
    total,
    page: currentPage,
    pageSize,
  } = await getListingsForOwner(user.id, {
    page: requestedPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isPagePastEnd = total > 0 && currentPage > totalPages;
  const hrefFor = (target: number) => pageHref("/dashboard/listings", target);

  async function pauseAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const listingId = String(formData.get("listingId") ?? "");
    try {
      await pauseListing(listingId, u.id);
    } catch (err) {
      const message =
        err instanceof ListingError ? err.message : "Failed to pause.";
      redirect(
        `/dashboard/listings?error=${encodeURIComponent(message)}`,
      );
    }
    redirect("/dashboard/listings");
  }

  async function unpauseAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const listingId = String(formData.get("listingId") ?? "");
    try {
      await unpauseListing(listingId, u.id);
    } catch (err) {
      const message =
        err instanceof ListingError ? err.message : "Failed to unpause.";
      redirect(
        `/dashboard/listings?error=${encodeURIComponent(message)}`,
      );
    }
    redirect("/dashboard/listings");
  }

  async function deleteAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const listingId = String(formData.get("listingId") ?? "");
    try {
      await deleteListing(listingId, u.id);
    } catch (err) {
      const message =
        err instanceof ListingError ? err.message : "Failed to delete.";
      redirect(
        `/dashboard/listings?error=${encodeURIComponent(message)}`,
      );
    }
    redirect("/dashboard/listings");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
        <Link
          href="/listings/new"
          className="text-sm underline underline-offset-2"
        >
          List a tool
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {total > 0 && totalPages > 1 && (
        <p className="mb-4 text-xs text-neutral-500">
          {total} listings · page {Math.min(currentPage, totalPages)} of{" "}
          {totalPages}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-neutral-600">
          You haven&apos;t listed any tools yet.{" "}
          <Link href="/listings/new" className="underline">
            Create your first listing
          </Link>
          .
        </p>
      ) : isPagePastEnd ? (
        <p className="text-sm text-neutral-600">
          This page is empty.{" "}
          <Link href={hrefFor(1)} className="underline">
            Go to page 1
          </Link>
          .
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {listings.map((l) => (
            <li
              key={l.id}
              className="flex flex-col gap-3 rounded border border-neutral-200 p-4"
            >
              <div className="flex items-baseline justify-between gap-2">
                <Link
                  href={`/listings/${l.id}`}
                  className="text-base font-medium underline-offset-2 hover:underline"
                >
                  {l.title}
                </Link>
                <ListingStatusBadge status={l.status} />
              </div>

              <p className="text-sm text-neutral-600">
                ${l.dailyRate.toFixed(2)}/day · {CONDITION_LABEL[l.condition]} ·{" "}
                {l.city}
              </p>

              <div className="flex flex-wrap items-start gap-3 pt-1">
                <Link
                  href={`/dashboard/listings/${l.id}/edit`}
                  className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800"
                >
                  Edit
                </Link>

                {l.status === "ACTIVE" ? (
                  <form action={pauseAction}>
                    <input type="hidden" name="listingId" value={l.id} />
                    <button
                      type="submit"
                      className="rounded border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-800"
                    >
                      Pause
                    </button>
                  </form>
                ) : (
                  <form action={unpauseAction}>
                    <input type="hidden" name="listingId" value={l.id} />
                    <button
                      type="submit"
                      className="rounded bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white"
                    >
                      Unpause
                    </button>
                  </form>
                )}

                <details className="flex-1 min-w-[200px]">
                  <summary className="cursor-pointer rounded border border-red-300 bg-red-50 px-3 py-1.5 text-center text-sm font-medium text-red-700">
                    Delete…
                  </summary>
                  <form
                    action={deleteAction}
                    className="mt-2 flex flex-col gap-2 rounded border border-red-200 bg-red-50 p-3"
                  >
                    <input type="hidden" name="listingId" value={l.id} />
                    <p className="text-xs text-red-800">
                      This hides the listing everywhere. Past rental requests
                      and messages remain intact.
                    </p>
                    <button
                      type="submit"
                      className="self-start rounded border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700"
                    >
                      Confirm delete
                    </button>
                  </form>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PaginationNav
        currentPage={currentPage}
        totalPages={totalPages}
        hrefFor={hrefFor}
      />
    </main>
  );
}
