import { prisma } from "@/lib/db";
import type { ItemCondition, Prisma } from "@prisma/client";
import { resolvePagination, type PaginationInput } from "@/lib/pagination";

export class ListingError extends Error {}

const VALID_CONDITIONS: ItemCondition[] = ["NEW", "LIKE_NEW", "GOOD", "FAIR"];

export type CreateListingInput = {
  ownerId: string;
  title: string;
  description: string;
  categoryId: string;
  dailyRate: number;
  condition: string;
  city: string;
  pickupEnabled: boolean;
  meetupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number | null;
};

type NormalizedListingFields = {
  title: string;
  description: string;
  city: string;
  condition: ItemCondition;
  dailyRate: string; // stored as Decimal — pass as .toFixed(2) string
  pickupEnabled: boolean;
  meetupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: string | null;
  categoryId: string;
};

// Validates + normalizes the user-editable fields. Shared between
// createListing and updateListing so both enforce identical rules.
async function normalizeListingFields(
  input: Omit<CreateListingInput, "ownerId">,
): Promise<NormalizedListingFields> {
  const title = input.title.trim();
  const description = input.description.trim();
  const city = input.city.trim();

  if (!title) throw new ListingError("Title is required.");
  if (title.length > 120) {
    throw new ListingError("Title must be 120 characters or fewer.");
  }
  if (!description) throw new ListingError("Description is required.");
  if (!city) throw new ListingError("City is required.");

  if (!Number.isFinite(input.dailyRate) || input.dailyRate <= 0) {
    throw new ListingError("Daily rate must be greater than 0.");
  }
  if (input.dailyRate > 10000) {
    throw new ListingError("Daily rate looks too high — double-check.");
  }

  if (!VALID_CONDITIONS.includes(input.condition as ItemCondition)) {
    throw new ListingError("Pick a valid condition.");
  }

  if (!input.pickupEnabled && !input.meetupEnabled && !input.deliveryEnabled) {
    throw new ListingError("Pick at least one handoff method.");
  }

  let deliveryFee: string | null = null;
  if (input.deliveryEnabled) {
    if (
      input.deliveryFee === null ||
      !Number.isFinite(input.deliveryFee) ||
      input.deliveryFee < 0
    ) {
      throw new ListingError(
        "Enter a delivery fee (0 or more) when delivery is enabled.",
      );
    }
    if (input.deliveryFee > 10000) {
      throw new ListingError("Delivery fee looks too high — double-check.");
    }
    deliveryFee = input.deliveryFee.toFixed(2);
  }

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
    select: { id: true },
  });
  if (!category) throw new ListingError("Category not found.");

  return {
    title,
    description,
    city,
    condition: input.condition as ItemCondition,
    dailyRate: input.dailyRate.toFixed(2),
    pickupEnabled: input.pickupEnabled,
    meetupEnabled: input.meetupEnabled,
    deliveryEnabled: input.deliveryEnabled,
    deliveryFee,
    categoryId: category.id,
  };
}

export async function createListing(input: CreateListingInput) {
  const fields = await normalizeListingFields(input);
  return prisma.listing.create({
    data: { ownerId: input.ownerId, photos: [], ...fields },
    select: { id: true },
  });
}

// -- Owner-scoped mutations ------------------------------------------
//
// All owner actions use `updateMany` with `ownerId` baked into the
// WHERE clause, so the auth check + status guard run atomically in one
// query. If result.count === 0 the caller doesn't own the row, or the
// row is in the wrong state, or the row doesn't exist — all surface as
// one ListingError.

export async function updateListing(
  listingId: string,
  ownerId: string,
  input: Omit<CreateListingInput, "ownerId">,
) {
  const fields = await normalizeListingFields(input);
  const result = await prisma.listing.updateMany({
    where: { id: listingId, ownerId, status: { not: "DELETED" } },
    data: fields,
  });
  if (result.count === 0) {
    throw new ListingError("Can't update this listing.");
  }
}

export async function pauseListing(listingId: string, ownerId: string) {
  const result = await prisma.listing.updateMany({
    where: { id: listingId, ownerId, status: "ACTIVE" },
    data: { status: "PAUSED" },
  });
  if (result.count === 0) {
    throw new ListingError("Can't pause this listing.");
  }
}

export async function unpauseListing(listingId: string, ownerId: string) {
  const result = await prisma.listing.updateMany({
    where: { id: listingId, ownerId, status: "PAUSED" },
    data: { status: "ACTIVE" },
  });
  if (result.count === 0) {
    throw new ListingError("Can't unpause this listing.");
  }
}

// Soft-delete: flips status to DELETED so the row (and its FK ties to
// historical rental requests / messages) stays intact. A hard delete
// would either cascade and erase that history or fail on the restrict.
export async function deleteListing(listingId: string, ownerId: string) {
  const result = await prisma.listing.updateMany({
    where: { id: listingId, ownerId, status: { not: "DELETED" } },
    data: { status: "DELETED" },
  });
  if (result.count === 0) {
    throw new ListingError("Can't delete this listing.");
  }
}

// -- Reads -----------------------------------------------------------

// Homepage feed. Only ACTIVE listings, newest first. Keep the select
// narrow — this list view doesn't need description, address, etc.
// All filters are optional and only applied when provided.
export type ListingFilters = {
  keyword?: string;
  categoryId?: string;
  categorySlug?: string;
  city?: string;
  handoff?: "PICKUP" | "MEETUP" | "DELIVERY";
  maxDailyRate?: number;
};

export async function getListings(
  filters: ListingFilters = {},
  pagination: PaginationInput = {},
) {
  const where: Prisma.ListingWhereInput = { status: "ACTIVE" };

  if (filters.keyword) {
    where.OR = [
      { title: { contains: filters.keyword, mode: "insensitive" } },
      { description: { contains: filters.keyword, mode: "insensitive" } },
    ];
  }

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  } else if (filters.categorySlug) {
    where.category = { slug: filters.categorySlug };
  }

  if (filters.city) {
    // Use contains so "Austin" matches "Austin, TX" etc. — friendlier than equals.
    where.city = { contains: filters.city, mode: "insensitive" };
  }

  if (filters.handoff === "PICKUP") where.pickupEnabled = true;
  if (filters.handoff === "MEETUP") where.meetupEnabled = true;
  if (filters.handoff === "DELIVERY") where.deliveryEnabled = true;

  if (
    filters.maxDailyRate !== undefined &&
    Number.isFinite(filters.maxDailyRate)
  ) {
    where.dailyRate = { lte: filters.maxDailyRate };
  }

  const { page, pageSize, skip, take } = resolvePagination(pagination);

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        title: true,
        dailyRate: true,
        condition: true,
        city: true,
        pickupEnabled: true,
        meetupEnabled: true,
        deliveryEnabled: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

// Owner's "My listings" feed. Includes ACTIVE + PAUSED, excludes
// DELETED (soft-deleted listings stay in the DB for referential
// integrity but shouldn't appear in the owner UI either).
export async function getListingsForOwner(
  ownerId: string,
  pagination: PaginationInput = {},
) {
  const { page, pageSize, skip, take } = resolvePagination(pagination);
  const where: Prisma.ListingWhereInput = {
    ownerId,
    status: { not: "DELETED" },
  };

  const [items, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        title: true,
        dailyRate: true,
        status: true,
        condition: true,
        city: true,
        pickupEnabled: true,
        meetupEnabled: true,
        deliveryEnabled: true,
      },
    }),
    prisma.listing.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

// Single-listing read for the owner's edit page. Returns null when the
// listing is missing, deleted, or not owned by this user — the page
// should call notFound() in that case (doesn't leak existence).
export async function getListingForOwner(id: string, ownerId: string) {
  return prisma.listing.findFirst({
    where: { id, ownerId, status: { not: "DELETED" } },
    select: {
      id: true,
      title: true,
      description: true,
      dailyRate: true,
      condition: true,
      city: true,
      pickupEnabled: true,
      meetupEnabled: true,
      deliveryEnabled: true,
      deliveryFee: true,
      categoryId: true,
      status: true,
    },
  });
}

// Detail view. Returns null if missing or not ACTIVE; the page should
// call notFound() in that case. `ownerId` is included so the detail
// page can decide whether to show the rental-request form.
export async function getListingById(id: string) {
  return prisma.listing.findFirst({
    where: { id, status: "ACTIVE" },
    select: {
      id: true,
      ownerId: true,
      title: true,
      description: true,
      dailyRate: true,
      condition: true,
      city: true,
      pickupEnabled: true,
      meetupEnabled: true,
      deliveryEnabled: true,
      deliveryFee: true,
      category: { select: { name: true } },
    },
  });
}
