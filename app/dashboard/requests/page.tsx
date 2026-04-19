import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  approveRentalRequest,
  cancelRentalRequest,
  declineRentalRequest,
  getRentalsForOwner,
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

export default async function IncomingRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; page?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const { error } = params;
  const requestedPage = parsePage(params.page);

  // Pure newest-first order. Pending requests are still obvious at a
  // glance thanks to the Approve/Decline buttons that only render on
  // REQUESTED rows. Sorting by status across page boundaries would lie
  // about what "page 2" contains, so it's dropped when paginating.
  const {
    items: requests,
    total,
    page: currentPage,
    pageSize,
  } = await getRentalsForOwner(user.id, {
    page: requestedPage,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const isPagePastEnd = total > 0 && currentPage > totalPages;
  const hrefFor = (target: number) => pageHref("/dashboard/requests", target);

  async function approveAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const requestId = String(formData.get("requestId") ?? "");
    try {
      await approveRentalRequest(requestId, u.id);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to approve.";
      redirect(`/dashboard/requests?error=${encodeURIComponent(message)}`);
    }
    redirect("/dashboard/requests");
  }

  async function declineAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const requestId = String(formData.get("requestId") ?? "");
    const ownerNote =
      (formData.get("ownerNote") as string | null) || null;
    try {
      await declineRentalRequest(requestId, u.id, ownerNote);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to decline.";
      redirect(`/dashboard/requests?error=${encodeURIComponent(message)}`);
    }
    redirect("/dashboard/requests");
  }

  // Inline cancel for APPROVED rentals — passes null for reason. Owners
  // who want to leave a reason can use the /rentals/[id] cancel form.
  async function cancelAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const requestId = String(formData.get("requestId") ?? "");
    try {
      await cancelRentalRequest(requestId, u.id, null);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to cancel.";
      redirect(`/dashboard/requests?error=${encodeURIComponent(message)}`);
    }
    redirect("/dashboard/requests");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Incoming requests
        </h1>
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
          {total} requests · page {Math.min(currentPage, totalPages)} of{" "}
          {totalPages}
        </p>
      )}

      {total === 0 ? (
        <p className="text-sm text-neutral-600">
          No incoming requests yet. When someone asks to rent one of your
          tools, it&apos;ll show up here.{" "}
          <Link href="/dashboard/listings" className="underline">
            Check your listings
          </Link>{" "}
          are live.
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
        <ul className="flex flex-col gap-4">
          {requests.map((r) => {
            const isPending = r.status === "REQUESTED";
            return (
              <li
                key={r.id}
                className="flex flex-col gap-3 rounded border border-neutral-200 p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <Link
                    href={`/rentals/${r.id}`}
                    className="text-base font-medium underline-offset-2 hover:underline"
                  >
                    {r.listing.title}
                  </Link>
                  <RentalStatusBadge status={r.status} />
                </div>

                <p className="text-sm text-neutral-700">
                  From <span className="font-medium">{r.renter.name}</span> ·{" "}
                  <span className="text-neutral-500">{r.renter.email}</span>
                </p>

                <p className="text-sm text-neutral-700">
                  {formatDate(r.startDate)} → {formatDate(r.endDate)} ·{" "}
                  {HANDOFF_LABEL[r.handoffMethod]} · $
                  {r.totalAmount.toFixed(2)}
                </p>

                {r.handoffMethod === "DELIVERY" && r.deliveryAddress && (
                  <p className="text-sm text-neutral-700">
                    <span className="text-neutral-500">Delivery to:</span>{" "}
                    {r.deliveryAddress}
                  </p>
                )}

                {r.renterNote && (
                  <div className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                    <p className="mb-1 text-xs text-neutral-500">
                      Message from renter
                    </p>
                    <p className="whitespace-pre-wrap">{r.renterNote}</p>
                  </div>
                )}

                {r.status === "DECLINED" && r.ownerNote && (
                  <div className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
                    <p className="mb-1 text-xs text-neutral-500">Your note</p>
                    <p className="whitespace-pre-wrap">{r.ownerNote}</p>
                  </div>
                )}

                {isPending && (
                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start">
                    <form action={approveAction}>
                      <input
                        type="hidden"
                        name="requestId"
                        value={r.id}
                      />
                      <button
                        type="submit"
                        className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        Approve
                      </button>
                    </form>

                    <details className="flex-1">
                      <summary className="cursor-pointer rounded border border-neutral-300 px-4 py-2 text-center text-sm font-medium text-neutral-800">
                        Decline…
                      </summary>
                      <form
                        action={declineAction}
                        className="mt-2 flex flex-col gap-2"
                      >
                        <input
                          type="hidden"
                          name="requestId"
                          value={r.id}
                        />
                        <textarea
                          name="ownerNote"
                          rows={2}
                          placeholder="Optional note to the renter"
                          className="rounded border border-neutral-300 px-3 py-2 text-sm"
                        />
                        <button
                          type="submit"
                          className="rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
                        >
                          Decline request
                        </button>
                      </form>
                    </details>
                  </div>
                )}

                {r.status === "APPROVED" && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium text-neutral-800">
                      Cancel rental…
                    </summary>
                    <form
                      action={cancelAction}
                      className="mt-2 flex flex-col gap-2"
                    >
                      <input
                        type="hidden"
                        name="requestId"
                        value={r.id}
                      />
                      <p className="text-xs text-neutral-600">
                        This cancels the approved booking. {r.renter.name}{" "}
                        will see it as cancelled. This can&apos;t be undone.
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
