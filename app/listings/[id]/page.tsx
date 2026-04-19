import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { getListingById } from "@/server/listings";
import { createRentalRequest, RentalError } from "@/server/rentals";

const CONDITION_LABEL = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  FAIR: "Fair",
} as const;

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const listing = await getListingById(id);
  if (!listing) notFound();

  const user = await getCurrentUser();
  const isOwner = user?.id === listing.ownerId;

  async function requestAction(formData: FormData) {
    "use server";
    const renter = await requireUser();
    try {
      await createRentalRequest({
        renterId: renter.id,
        listingId: id,
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        handoffMethod: String(formData.get("handoffMethod") ?? ""),
        deliveryAddress:
          (formData.get("deliveryAddress") as string | null) || null,
        renterNote: (formData.get("renterNote") as string | null) || null,
      });
    } catch (err) {
      const message =
        err instanceof RentalError ? err.message : "Request failed.";
      redirect(`/listings/${id}?error=${encodeURIComponent(message)}`);
    }
    redirect("/dashboard/rentals");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-6 py-8">
      <Link
        href="/"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← All listings
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {listing.title}
        </h1>
        <p className="text-sm text-neutral-500">
          {listing.category.name} · {CONDITION_LABEL[listing.condition]} ·{" "}
          {listing.city}
        </p>
      </header>

      <p className="text-2xl font-medium">
        ${listing.dailyRate.toFixed(2)}
        <span className="ml-1 text-sm font-normal text-neutral-500">
          / day
        </span>
      </p>

      <section>
        <h2 className="mb-1 text-sm font-medium text-neutral-700">
          Description
        </h2>
        <p className="whitespace-pre-wrap text-sm text-neutral-800">
          {listing.description}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Handoff</h2>
        <ul className="flex flex-wrap gap-2 text-sm">
          {listing.pickupEnabled && <HandoffItem>Pickup</HandoffItem>}
          {listing.meetupEnabled && <HandoffItem>Meetup</HandoffItem>}
          {listing.deliveryEnabled && (
            <HandoffItem>
              Delivery
              {listing.deliveryFee !== null && (
                <> · ${listing.deliveryFee.toFixed(2)}</>
              )}
            </HandoffItem>
          )}
        </ul>
      </section>

      <hr className="border-neutral-200" />

      {isOwner ? (
        <p className="text-sm text-neutral-500">This is your listing.</p>
      ) : !user ? (
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-medium">Request this tool</h2>
          <p className="text-sm text-neutral-600">
            <Link href="/login" className="underline">
              Log in
            </Link>{" "}
            or{" "}
            <Link href="/signup" className="underline">
              create an account
            </Link>{" "}
            to send a request.
          </p>
        </section>
      ) : (
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-medium">Request this tool</h2>

          {error && (
            <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <form action={requestAction} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">
                Start date
                <input
                  name="startDate"
                  type="date"
                  required
                  className="rounded border border-neutral-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                End date
                <input
                  name="endDate"
                  type="date"
                  required
                  className="rounded border border-neutral-300 px-3 py-2"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              Handoff method
              <select
                name="handoffMethod"
                required
                defaultValue=""
                className="rounded border border-neutral-300 px-3 py-2"
              >
                <option value="" disabled>
                  Choose a method…
                </option>
                {listing.pickupEnabled && (
                  <option value="PICKUP">Owner pickup</option>
                )}
                {listing.meetupEnabled && (
                  <option value="MEETUP">Public meetup</option>
                )}
                {listing.deliveryEnabled && (
                  <option value="DELIVERY">Delivery</option>
                )}
              </select>
            </label>

            {listing.deliveryEnabled && (
              <label className="flex flex-col gap-1 text-sm">
                Delivery address
                <span className="text-xs text-neutral-500">
                  Only required if you pick Delivery.
                </span>
                <input
                  name="deliveryAddress"
                  type="text"
                  autoComplete="street-address"
                  className="rounded border border-neutral-300 px-3 py-2"
                />
              </label>
            )}

            <label className="flex flex-col gap-1 text-sm">
              Message to owner (optional)
              <textarea
                name="renterNote"
                rows={3}
                className="rounded border border-neutral-300 px-3 py-2"
              />
            </label>

            <button
              type="submit"
              className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
            >
              Send request
            </button>
          </form>
        </section>
      )}
    </main>
  );
}

function HandoffItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded border border-neutral-300 px-2 py-0.5 text-neutral-700">
      {children}
    </li>
  );
}
