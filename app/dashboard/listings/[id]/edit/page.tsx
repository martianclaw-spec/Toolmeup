import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getListingForOwner,
  ListingError,
  updateListing,
} from "@/server/listings";

export default async function EditListingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;

  const [listing, categories] = await Promise.all([
    getListingForOwner(id, user.id),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);
  if (!listing) notFound();

  async function action(formData: FormData) {
    "use server";
    const u = await requireUser();
    const dailyRateRaw = formData.get("dailyRate");
    const deliveryFeeRaw = formData.get("deliveryFee");
    const holdingFeeRaw = formData.get("holdingFee");

    try {
      await updateListing(id, u.id, {
        title: String(formData.get("title") ?? ""),
        description: String(formData.get("description") ?? ""),
        categoryId: String(formData.get("categoryId") ?? ""),
        condition: String(formData.get("condition") ?? ""),
        city: String(formData.get("city") ?? ""),
        dailyRate:
          dailyRateRaw === null || dailyRateRaw === ""
            ? NaN
            : Number(dailyRateRaw),
        pickupEnabled: formData.get("pickupEnabled") === "on",
        meetupEnabled: formData.get("meetupEnabled") === "on",
        deliveryEnabled: formData.get("deliveryEnabled") === "on",
        deliveryFee:
          deliveryFeeRaw === null || deliveryFeeRaw === ""
            ? null
            : Number(deliveryFeeRaw),
        holdingFee:
          holdingFeeRaw === null || holdingFeeRaw === ""
            ? null
            : Number(holdingFeeRaw),
        experienceLevel: String(formData.get("experienceLevel") ?? ""),
        usageNotes: (formData.get("usageNotes") as string | null) || null,
      });
    } catch (err) {
      const message =
        err instanceof ListingError ? err.message : "Failed to save listing.";
      redirect(
        `/dashboard/listings/${id}/edit?error=${encodeURIComponent(message)}`,
      );
    }

    redirect("/dashboard/listings");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-6 py-10">
      <Link
        href="/dashboard/listings"
        className="text-sm text-neutral-500 underline underline-offset-2"
      >
        ← My listings
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Title
          <input
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={listing.title}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Description
          <textarea
            name="description"
            required
            rows={4}
            defaultValue={listing.description}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Category
          <select
            name="categoryId"
            required
            defaultValue={listing.categoryId}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Daily rate (USD)
          <input
            name="dailyRate"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={listing.dailyRate.toFixed(2)}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Condition
          <select
            name="condition"
            required
            defaultValue={listing.condition}
            className="rounded border border-neutral-300 px-3 py-2"
          >
            <option value="NEW">New</option>
            <option value="LIKE_NEW">Like new</option>
            <option value="GOOD">Good</option>
            <option value="FAIR">Fair</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          City
          <input
            name="city"
            type="text"
            required
            defaultValue={listing.city}
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>

        <fieldset className="flex flex-col gap-2 rounded border border-neutral-200 p-3 text-sm">
          <legend className="px-1 text-neutral-600">Handoff</legend>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="pickupEnabled"
              defaultChecked={listing.pickupEnabled}
            />
            Owner pickup
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="meetupEnabled"
              defaultChecked={listing.meetupEnabled}
            />
            Public meetup
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="deliveryEnabled"
              defaultChecked={listing.deliveryEnabled}
            />
            Delivery
          </label>
          <label className="mt-1 flex flex-col gap-1 text-sm">
            Delivery fee (USD, if delivery is enabled)
            <input
              name="deliveryFee"
              type="number"
              min="0"
              step="0.01"
              defaultValue={
                listing.deliveryFee !== null
                  ? listing.deliveryFee.toFixed(2)
                  : ""
              }
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded border border-neutral-200 p-3 text-sm">
          <legend className="px-1 text-neutral-600">Trust &amp; safety</legend>

          <label className="flex flex-col gap-1 text-sm">
            Required experience level
            <select
              name="experienceLevel"
              required
              defaultValue={listing.experienceLevel}
              className="rounded border border-neutral-300 px-3 py-2"
            >
              <option value="BEGINNER_OK">Beginner OK</option>
              <option value="SOME_EXPERIENCE">Some experience recommended</option>
              <option value="EXPERIENCED_ONLY">Experienced users only</option>
            </select>
            <span className="text-xs text-neutral-500">
              Helps renters pick tools they&apos;ll handle safely.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Holding fee (optional)
            <input
              name="holdingFee"
              type="number"
              min="0"
              step="0.01"
              placeholder="e.g. 200"
              defaultValue={
                listing.holdingFee !== null ? listing.holdingFee.toFixed(2) : ""
              }
              className="rounded border border-neutral-300 px-3 py-2"
            />
            <span className="text-xs text-neutral-500">
              Amount renter agrees to cover if the tool is not returned or
              is damaged.
            </span>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Usage notes (optional)
            <textarea
              name="usageNotes"
              rows={3}
              maxLength={500}
              placeholder="Watch a tutorial before using. Be careful of kickback."
              defaultValue={listing.usageNotes ?? ""}
              className="rounded border border-neutral-300 px-3 py-2"
            />
            <span className="text-xs text-neutral-500">
              Safety tips or anything the renter should know. Up to 500
              characters.
            </span>
          </label>
        </fieldset>

        <div className="flex gap-3">
          <button
            type="submit"
            className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
          >
            Save changes
          </button>
          <Link
            href="/dashboard/listings"
            className="rounded border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800"
          >
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
