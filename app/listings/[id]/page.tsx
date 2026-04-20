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

const EXPERIENCE_LABEL = {
  BEGINNER_OK: "Beginner OK",
  SOME_EXPERIENCE: "Some experience recommended",
  EXPERIENCED_ONLY: "Experienced users only",
} as const;

const EXPERIENCE_TONE = {
  BEGINNER_OK: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SOME_EXPERIENCE: "border-amber-200 bg-amber-50 text-amber-800",
  EXPERIENCED_ONLY: "border-red-200 bg-red-50 text-red-800",
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

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {listing.title}
        </h1>
        <p className="text-sm text-neutral-500">
          {listing.category.name} · {CONDITION_LABEL[listing.condition]} ·{" "}
          {listing.city}
        </p>
        <span
          className={`w-fit rounded-full border px-2.5 py-0.5 text-xs font-medium ${EXPERIENCE_TONE[listing.experienceLevel]}`}
        >
          {EXPERIENCE_LABEL[listing.experienceLevel]}
        </span>
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

      {listing.usageNotes && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="mb-1 text-sm font-semibold text-amber-900">
            Usage notes from the owner
          </h2>
          <p className="whitespace-pre-wrap text-sm text-amber-900">
            {listing.usageNotes}
          </p>
        </section>
      )}

      {/* Trust & safety block */}
      <section className="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          Before you rent
        </h2>
        <ul className="flex flex-col gap-2 text-sm text-neutral-700">
          <li>
            Renters are responsible for returning tools in agreed condition
            or covering replacement cost.
          </li>
          <li>Meet locally and inspect the tool before taking it.</li>
          <li>
            Payment is handled directly between renter and owner (cash,
            Venmo, etc.).
          </li>
        </ul>

        {listing.holdingFee !== null && (
          <div className="mt-1 rounded-md border border-neutral-300 bg-white p-3">
            <p className="text-sm text-neutral-900">
              <span className="font-semibold">Holding fee:</span> $
              {listing.holdingFee.toFixed(2)}
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              This is an agreement between renter and owner. Toolmeup does
              not process or enforce payments.
            </p>
          </div>
        )}
      </section>

      {/* How this works — 4 step trust strip */}
      <section>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">
          How this works
        </h2>
        <ol className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          <TrustStep n={1} title="Message before renting">
            Ask anything you need to know before showing up.
          </TrustStep>
          <TrustStep n={2} title="Agree on condition">
            Confirm the tool&apos;s condition with the owner up front.
          </TrustStep>
          <TrustStep n={3} title="Meet locally">
            Inspect the tool together at pickup, meetup, or delivery.
          </TrustStep>
          <TrustStep n={4} title="Leave a review">
            Help the community by leaving an honest review afterward.
          </TrustStep>
        </ol>
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

            <label className="flex items-start gap-2 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-800">
              <input
                type="checkbox"
                name="safetyAcknowledged"
                required
                className="mt-0.5"
              />
              <span>I understand how to safely use this tool.</span>
            </label>

            <p className="text-xs text-neutral-500">
              Payment is handled directly between renter and owner (cash,
              Venmo, etc.).
            </p>

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

function TrustStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3 rounded-md border border-neutral-200 bg-white p-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-neutral-900">
        {n}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-neutral-900">{title}</span>
        <span className="text-xs text-neutral-600">{children}</span>
      </div>
    </li>
  );
}
