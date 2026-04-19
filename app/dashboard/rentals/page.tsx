import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  cancelRentalRequest,
  getRentalsForRenter,
  RentalError,
} from "@/server/rentals";
import {
  DEFAULT_PAGE_SIZE,
  pageHref,
  parsePage,
} from "@/lib/pagination";
import { PaginationNav } from "@/components/pagination";
import { RentalStatusBadge } from "@/components/status-badge";

const HANDOFF_LABEL = {
  PICKUP: "Pickup",
  MEETUP: "Meetup",
  DELIVERY: "Delivery",
} as const;

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function MyRentalsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const requestedPage = parsePage(params.page);
  const { error } = params;

  const {
    items: rentals,
    total,
    page: currentPage,
    pageSize,
  } = await getRentalsForRenter(user.id, {
    page: requestedPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isPagePastEnd = total > 0 && currentPage > totalPages;
  const hrefFor = (target: number) => pageHref("/dashboard/rentals", target);

  // Inline cancel — passes null for reason. The /rentals/[id] page still
  // offers an optional reason textarea for users who want to explain.
  async function cancelAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const rentalId = String(formData.get("rentalId") ?? "");
    try {
      await cancelRentalRequest(rentalId, u.id, null);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to cancel.";
      redirect(`/dashboard/rentals?error=${encodeURIComponent(message)}`);
    }
    redirect("/dashboard/rentals");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My rentals</h1>
        <Link href="/" className="text-sm underline underline-offset-2">
          Browse listings
        </Link>
      </header>

      {error && (
        <p className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {total > 0 && totalPages > 1 && (
        <p className="mb-4 text-xs text-neutral-500">
          {total} rentals · page {Math.min(currentPage, totalPages)} of{" "}
          {totalPages}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-neutral-600">
          You haven&apos;t requested any rentals yet.{" "}
          <Link href="/" className="underline">
            Find a tool
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
          {rentals.map((r) => {
            const cancelLabel =
              r.status === "REQUESTED"
                ? "Cancel request"
                : r.status === "APPROVED"
                  ? "Cancel rental"
                  : null;

            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded border border-neutral-200 p-4"
              >
                <Link
                  href={`/rentals/${r.id}`}
                  className="flex flex-col gap-1 hover:underline sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-medium">
                      {r.listing.title}
                    </h2>
                    <p className="text-sm text-neutral-600">
                      {formatDate(r.startDate)} → {formatDate(r.endDate)} ·{" "}
                      {HANDOFF_LABEL[r.handoffMethod]} · $
                      {r.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <span className="self-start sm:self-center">
                    <RentalStatusBadge status={r.status} />
                  </span>
                </Link>

                {cancelLabel && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-neutral-800">
                      {cancelLabel}…
                    </summary>
                    <form
                      action={cancelAction}
                      className="mt-2 flex flex-col gap-2"
                    >
                      <input
                        type="hidden"
                        name="rentalId"
                        value={r.id}
                      />
                      <p className="text-xs text-neutral-600">
                        {r.status === "REQUESTED"
                          ? "This withdraws your request. The owner will see it as cancelled."
                          : "This cancels the approved booking. The owner will see it as cancelled."}{" "}
                        This can&apos;t be undone.
                      </p>
                      <button
                        type="submit"
                        className="self-start rounded border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700"
                      >
                        Confirm cancel
                      </button>
                    </form>
                  </details>
                )}
              </li>
            );
          })}
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
