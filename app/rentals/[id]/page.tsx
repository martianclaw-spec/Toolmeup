import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import {
  cancelRentalRequest,
  getRentalForParticipant,
  markRentalCompleted,
  markRentalReturned,
  RentalError,
} from "@/server/rentals";
import {
  createMessage,
  getMessagesForRental,
  MessageError,
} from "@/server/messages";
import {
  createReview,
  getReviewsForRental,
  ReviewError,
} from "@/server/reviews";
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

function formatMessageTime(d: Date) {
  return d.toLocaleString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function RentalDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const rental = await getRentalForParticipant(id, user.id);
  if (!rental) notFound();

  const [messages, reviews] = await Promise.all([
    getMessagesForRental(id),
    rental.status === "COMPLETED"
      ? getReviewsForRental(id)
      : Promise.resolve([]),
  ]);

  const isRenter = user.id === rental.renterId;
  const counterpart = isRenter ? rental.owner : rental.renter;
  const backHref = isRenter ? "/dashboard/rentals" : "/dashboard/requests";
  const backLabel = isRenter ? "My rentals" : "Incoming requests";

  const canReturn =
    rental.status === "APPROVED" || rental.status === "ACTIVE";
  const canComplete = rental.status === "RETURNED";
  // Cancellation rules mirror the server guard in cancelRentalRequest.
  const canCancel =
    (rental.status === "REQUESTED" && isRenter) ||
    rental.status === "APPROVED";

  const myReview = reviews.find((r) => r.authorId === user.id) ?? null;
  const theirReview = reviews.find((r) => r.authorId !== user.id) ?? null;
  const canReview = rental.status === "COMPLETED" && !myReview;

  async function sendAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    try {
      await createMessage(id, u.id, String(formData.get("body") ?? ""));
    } catch (err) {
      const message =
        err instanceof MessageError ? err.message : "Failed to send.";
      redirect(`/rentals/${id}?error=${encodeURIComponent(message)}`);
    }
    redirect(`/rentals/${id}`);
  }

  async function returnAction() {
    "use server";
    const u = await requireUser();
    try {
      await markRentalReturned(id, u.id);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to update.";
      redirect(`/rentals/${id}?error=${encodeURIComponent(message)}`);
    }
    redirect(`/rentals/${id}`);
  }

  async function completeAction() {
    "use server";
    const u = await requireUser();
    try {
      await markRentalCompleted(id, u.id);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to update.";
      redirect(`/rentals/${id}?error=${encodeURIComponent(message)}`);
    }
    redirect(`/rentals/${id}`);
  }

  async function cancelAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    const reason =
      (formData.get("cancelReason") as string | null) || null;
    try {
      await cancelRentalRequest(id, u.id, reason);
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Failed to cancel.";
      redirect(`/rentals/${id}?error=${encodeURIComponent(message)}`);
    }
    redirect(`/rentals/${id}`);
  }

  async function reviewAction(formData: FormData) {
    "use server";
    const u = await requireUser();
    try {
      await createReview({
        rentalId: id,
        authorId: u.id,
        rating: Number(formData.get("rating")),
        comment: (formData.get("comment") as string | null) || null,
      });
    } catch (err) {
      const message =
        err instanceof ReviewError ? err.message : "Failed to submit review.";
      redirect(`/rentals/${id}?error=${encodeURIComponent(message)}`);
    }
    redirect(`/rentals/${id}`);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-8">
      <Link
        href={backHref}
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← {backLabel}
      </Link>

      <header className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <Link
            href={`/listings/${rental.listing.id}`}
            className="text-2xl font-semibold tracking-tight underline-offset-2 hover:underline"
          >
            {rental.listing.title}
          </Link>
          <RentalStatusBadge status={rental.status} />
        </div>
        <p className="text-sm text-neutral-600">
          With{" "}
          <Link
            href={`/profile/${counterpart.id}`}
            className="font-medium underline underline-offset-2"
          >
            {counterpart.name}
          </Link>
        </p>
      </header>

      <section className="flex flex-col gap-1 text-sm text-neutral-800">
        <p>
          <span className="text-neutral-500">Dates:</span>{" "}
          {formatDate(rental.startDate)} → {formatDate(rental.endDate)}
        </p>
        <p>
          <span className="text-neutral-500">Handoff:</span>{" "}
          {HANDOFF_LABEL[rental.handoffMethod]}
        </p>
        <p>
          <span className="text-neutral-500">Total:</span> $
          {rental.totalAmount.toFixed(2)}
        </p>
        {rental.handoffMethod === "DELIVERY" && rental.deliveryAddress && (
          <p>
            <span className="text-neutral-500">Delivery address:</span>{" "}
            {rental.deliveryAddress}
          </p>
        )}
        {rental.status === "COMPLETED" && rental.completedAt && (
          <p>
            <span className="text-neutral-500">Completed on:</span>{" "}
            {formatDate(rental.completedAt)}
          </p>
        )}
        {rental.status === "CANCELLED" && rental.cancelledAt && (
          <p>
            <span className="text-neutral-500">Cancelled on:</span>{" "}
            {formatDate(rental.cancelledAt)}
            {rental.cancelledBy && (
              <>
                {" "}
                by{" "}
                {rental.cancelledBy.id === user.id
                  ? "you"
                  : rental.cancelledBy.name}
              </>
            )}
          </p>
        )}
      </section>

      {(canReturn || canComplete) && (
        <section className="flex flex-col gap-2 rounded border border-neutral-200 p-3">
          <h2 className="text-sm font-medium text-neutral-700">
            {canReturn ? "Returning" : "Closing out"}
          </h2>
          <p className="text-xs text-neutral-500">
            Either you or {counterpart.name} can mark this.
          </p>
          {canReturn && (
            <form action={returnAction}>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Mark as returned
              </button>
            </form>
          )}
          {canComplete && (
            <form action={completeAction}>
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
              >
                Mark as completed
              </button>
            </form>
          )}
        </section>
      )}

      {canCancel && (
        <details className="rounded border border-neutral-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-neutral-800">
            Cancel this rental…
          </summary>
          <form action={cancelAction} className="mt-3 flex flex-col gap-3">
            <p className="text-xs text-neutral-600">
              {rental.status === "REQUESTED"
                ? "This withdraws your request. The owner will see it as cancelled."
                : "This cancels the approved booking. The other party will see it as cancelled."}{" "}
              This can&apos;t be undone.
            </p>
            <label className="flex flex-col gap-1 text-sm">
              Reason (optional)
              <textarea
                name="cancelReason"
                rows={2}
                maxLength={500}
                placeholder="e.g. schedule change, found it elsewhere"
                className="rounded border border-neutral-300 px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="self-start rounded border border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700"
            >
              Confirm cancel
            </button>
          </form>
        </details>
      )}

      {rental.renterNote && (
        <section className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
          <p className="mb-1 text-xs text-neutral-500">
            Original request from {rental.renter.name}
          </p>
          <p className="whitespace-pre-wrap">{rental.renterNote}</p>
        </section>
      )}

      {rental.status === "DECLINED" && rental.ownerNote && (
        <section className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
          <p className="mb-1 text-xs text-neutral-500">
            Decline note from {rental.owner.name}
          </p>
          <p className="whitespace-pre-wrap">{rental.ownerNote}</p>
        </section>
      )}

      {rental.status === "CANCELLED" && rental.cancelReason && (
        <section className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
          <p className="mb-1 text-xs text-neutral-500">
            Cancellation reason
            {rental.cancelledBy && (
              <>
                {" from "}
                {rental.cancelledBy.id === user.id
                  ? "you"
                  : rental.cancelledBy.name}
              </>
            )}
          </p>
          <p className="whitespace-pre-wrap">{rental.cancelReason}</p>
        </section>
      )}

      {rental.status === "COMPLETED" && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-neutral-700">Reviews</h2>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-500">
              {counterpart.name}&apos;s review of you
            </p>
            {theirReview ? (
              <ReviewCard
                rating={theirReview.rating}
                comment={theirReview.comment}
                byName={theirReview.author.name}
                byId={theirReview.author.id}
                createdAt={theirReview.createdAt}
              />
            ) : (
              <p className="text-sm text-neutral-500">
                {counterpart.name} hasn&apos;t left a review yet.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs text-neutral-500">Your review</p>
            {myReview ? (
              <ReviewCard
                rating={myReview.rating}
                comment={myReview.comment}
                byName="You"
                byId={null}
                createdAt={myReview.createdAt}
              />
            ) : canReview ? (
              <form
                action={reviewAction}
                className="flex flex-col gap-3 rounded border border-neutral-200 p-3"
              >
                <label className="flex flex-col gap-1 text-sm">
                  Rating
                  <select
                    name="rating"
                    required
                    defaultValue=""
                    className="rounded border border-neutral-300 px-3 py-2"
                  >
                    <option value="" disabled>
                      Choose a rating…
                    </option>
                    <option value="5">5 / 5</option>
                    <option value="4">4 / 5</option>
                    <option value="3">3 / 5</option>
                    <option value="2">2 / 5</option>
                    <option value="1">1 / 5</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Comment (optional)
                  <textarea
                    name="comment"
                    rows={3}
                    maxLength={1000}
                    className="rounded border border-neutral-300 px-3 py-2"
                  />
                </label>
                <button
                  type="submit"
                  className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Submit review
                </button>
              </form>
            ) : null}
          </div>
        </section>
      )}

      <hr className="border-neutral-200" />

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-700">Messages</h2>

        {messages.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No messages yet. Send the first one below.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {messages.map((m) => {
              const isSelf = m.senderId === user.id;
              return (
                <li
                  key={m.id}
                  className={`flex max-w-[85%] flex-col gap-0.5 rounded px-3 py-2 text-sm ${
                    isSelf
                      ? "self-end bg-neutral-900 text-white"
                      : "self-start bg-neutral-100 text-neutral-900"
                  }`}
                >
                  <p
                    className={`text-xs ${
                      isSelf ? "text-neutral-300" : "text-neutral-500"
                    }`}
                  >
                    {isSelf ? "You" : m.sender.name} ·{" "}
                    {formatMessageTime(m.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={sendAction} className="flex flex-col gap-2">
        <label className="sr-only" htmlFor="body">
          New message
        </label>
        <textarea
          id="body"
          name="body"
          required
          rows={3}
          maxLength={2000}
          placeholder="Write a message…"
          className="rounded border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="self-end rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Send
        </button>
      </form>
    </main>
  );
}

function ReviewCard({
  rating,
  comment,
  byName,
  byId,
  createdAt,
}: {
  rating: number;
  comment: string | null;
  byName: string;
  byId: string | null;
  createdAt: Date;
}) {
  return (
    <div className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800">
      <p className="mb-1 text-xs text-neutral-500">
        {byId ? (
          <Link
            href={`/profile/${byId}`}
            className="underline underline-offset-2"
          >
            {byName}
          </Link>
        ) : (
          byName
        )}{" "}
        · {rating} / 5 · {formatDate(createdAt)}
      </p>
      {comment && <p className="whitespace-pre-wrap">{comment}</p>}
    </div>
  );
}
