import { prisma } from "@/lib/db";
import type { HandoffMethod, Prisma } from "@prisma/client";
import { resolvePagination, type PaginationInput } from "@/lib/pagination";

export class RentalError extends Error {}

const VALID_HANDOFFS: HandoffMethod[] = ["PICKUP", "MEETUP", "DELIVERY"];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

export type CreateRentalRequestInput = {
  renterId: string;
  listingId: string;
  startDate: string; // "YYYY-MM-DD" from a date input
  endDate: string; // "YYYY-MM-DD"
  handoffMethod: string;
  deliveryAddress: string | null;
  renterNote: string | null;
};

export async function createRentalRequest(input: CreateRentalRequestInput) {
  // Parse the dates as UTC midnight so day math doesn't shift by timezone.
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new RentalError("Enter valid start and end dates.");
  }
  if (start.getTime() > end.getTime()) {
    throw new RentalError("Start date must be on or before end date.");
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (start.getTime() < today.getTime()) {
    throw new RentalError("Start date can't be in the past.");
  }

  if (!VALID_HANDOFFS.includes(input.handoffMethod as HandoffMethod)) {
    throw new RentalError("Pick a valid handoff method.");
  }
  const handoffMethod = input.handoffMethod as HandoffMethod;

  const listing = await prisma.listing.findFirst({
    where: { id: input.listingId, status: "ACTIVE" },
    select: {
      id: true,
      ownerId: true,
      dailyRate: true,
      deliveryFee: true,
      currency: true,
      pickupEnabled: true,
      meetupEnabled: true,
      deliveryEnabled: true,
    },
  });
  if (!listing) throw new RentalError("Listing not found.");

  if (listing.ownerId === input.renterId) {
    throw new RentalError("You can't request your own listing.");
  }

  const allowed = {
    PICKUP: listing.pickupEnabled,
    MEETUP: listing.meetupEnabled,
    DELIVERY: listing.deliveryEnabled,
  }[handoffMethod];
  if (!allowed) {
    throw new RentalError(
      "That handoff method isn't offered for this listing.",
    );
  }

  let deliveryAddress: string | null = null;
  if (handoffMethod === "DELIVERY") {
    const addr = (input.deliveryAddress ?? "").trim();
    if (!addr) {
      throw new RentalError("Delivery address is required when you pick delivery.");
    }
    deliveryAddress = addr;
  }

  // Inclusive day count: same start and end = 1 day.
  const days =
    Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;

  const rate = Number(listing.dailyRate);
  const fee =
    handoffMethod === "DELIVERY" && listing.deliveryFee
      ? Number(listing.deliveryFee)
      : 0;
  const totalAmount = (rate * days + fee).toFixed(2);

  const renterNote = (input.renterNote ?? "").trim() || null;

  return prisma.rentalRequest.create({
    data: {
      listingId: listing.id,
      renterId: input.renterId,
      ownerId: listing.ownerId,
      startDate: start,
      endDate: end,
      handoffMethod,
      deliveryAddress,
      renterNote,
      status: "REQUESTED",
      totalAmount,
      currency: listing.currency,
    },
    select: { id: true },
  });
}

// -- Reads -----------------------------------------------------------

export async function getRentalsForRenter(
  renterId: string,
  pagination: PaginationInput = {},
) {
  const { page, pageSize, skip, take } = resolvePagination(pagination);
  const where: Prisma.RentalRequestWhereInput = { renterId };

  const [items, total] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        startDate: true,
        endDate: true,
        status: true,
        handoffMethod: true,
        totalAmount: true,
        listing: {
          select: { id: true, title: true, city: true },
        },
      },
    }),
    prisma.rentalRequest.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

// Rental detail for the message thread page. Returns the rental only if
// the requesting user is a participant (renter or owner). The OR clause
// is the auth check — if the user isn't one of the two, the row doesn't
// match and we return null, and the page renders notFound().
export async function getRentalForParticipant(
  rentalId: string,
  userId: string,
) {
  return prisma.rentalRequest.findFirst({
    where: {
      id: rentalId,
      OR: [{ renterId: userId }, { ownerId: userId }],
    },
    select: {
      id: true,
      renterId: true,
      ownerId: true,
      startDate: true,
      endDate: true,
      status: true,
      handoffMethod: true,
      deliveryAddress: true,
      totalAmount: true,
      renterNote: true,
      ownerNote: true,
      completedAt: true,
      cancelledAt: true,
      cancelledByUserId: true,
      cancelReason: true,
      renter: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
      cancelledBy: { select: { id: true, name: true } },
      listing: { select: { id: true, title: true } },
    },
  });
}

export async function getRentalsForOwner(
  ownerId: string,
  pagination: PaginationInput = {},
) {
  const { page, pageSize, skip, take } = resolvePagination(pagination);
  const where: Prisma.RentalRequestWhereInput = { ownerId };

  const [items, total] = await Promise.all([
    prisma.rentalRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      select: {
        id: true,
        createdAt: true,
        startDate: true,
        endDate: true,
        status: true,
        handoffMethod: true,
        deliveryAddress: true,
        totalAmount: true,
        renterNote: true,
        ownerNote: true,
        renter: { select: { name: true, email: true } },
        listing: { select: { id: true, title: true } },
      },
    }),
    prisma.rentalRequest.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

// -- Owner transitions -----------------------------------------------
//
// Both approve and decline use `updateMany` with the ownership + current
// status in the WHERE clause. This makes the auth check and the state
// transition atomic in a single query: if the row doesn't match (wrong
// owner, or already APPROVED/DECLINED/etc.), `result.count` is 0 and we
// throw. No "fetch then update" race window.

export async function approveRentalRequest(
  requestId: string,
  ownerId: string,
) {
  const result = await prisma.rentalRequest.updateMany({
    where: { id: requestId, ownerId, status: "REQUESTED" },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  if (result.count === 0) {
    throw new RentalError(
      "Can't approve this request — it may no longer be pending.",
    );
  }
}

export async function declineRentalRequest(
  requestId: string,
  ownerId: string,
  ownerNote: string | null,
) {
  const note = (ownerNote ?? "").trim() || null;
  const result = await prisma.rentalRequest.updateMany({
    where: { id: requestId, ownerId, status: "REQUESTED" },
    data: { status: "DECLINED", ownerNote: note },
  });
  if (result.count === 0) {
    throw new RentalError(
      "Can't decline this request — it may no longer be pending.",
    );
  }
}

// -- Participant transitions (return / complete) ---------------------
//
// Either the renter or the owner can advance the rental through these
// final steps. Same atomic-WHERE pattern as approve/decline — the
// `OR: [renterId, ownerId]` clause is the auth check, and the `status`
// clause enforces the allowed source states in a single query.
//
// Allowed transitions:
//   APPROVED | ACTIVE  →  RETURNED   (markReturned)
//   RETURNED           →  COMPLETED  (markCompleted, stamps completedAt)
//
// Anything else (REQUESTED, DECLINED, CANCELLED, COMPLETED) is rejected.

export async function markRentalReturned(rentalId: string, userId: string) {
  const result = await prisma.rentalRequest.updateMany({
    where: {
      id: rentalId,
      status: { in: ["APPROVED", "ACTIVE"] },
      OR: [{ renterId: userId }, { ownerId: userId }],
    },
    data: { status: "RETURNED" },
  });
  if (result.count === 0) {
    throw new RentalError(
      "Can't mark this as returned — check the current status.",
    );
  }
}

export async function markRentalCompleted(rentalId: string, userId: string) {
  const result = await prisma.rentalRequest.updateMany({
    where: {
      id: rentalId,
      status: "RETURNED",
      OR: [{ renterId: userId }, { ownerId: userId }],
    },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
  if (result.count === 0) {
    throw new RentalError(
      "Can't mark this as completed — it must be RETURNED first.",
    );
  }
}

// Cancellation rules (enforced atomically in a single WHERE clause):
//   REQUESTED → CANCELLED   — renter only (owner "declines" instead)
//   APPROVED  → CANCELLED   — either party (plans fell through before handoff)
// Once ACTIVE/RETURNED/COMPLETED/DECLINED/CANCELLED, no cancel allowed.
// Records cancelledAt + cancelledByUserId + optional cancelReason so the
// audit trail shows when, by whom, and (if given) why.
export async function cancelRentalRequest(
  rentalId: string,
  userId: string,
  reason: string | null,
) {
  const normalizedReason = (reason ?? "").trim() || null;
  if (normalizedReason && normalizedReason.length > 500) {
    throw new RentalError(
      "Cancellation reason must be 500 characters or fewer.",
    );
  }

  const result = await prisma.rentalRequest.updateMany({
    where: {
      id: rentalId,
      OR: [
        { status: "REQUESTED", renterId: userId },
        {
          status: "APPROVED",
          OR: [{ renterId: userId }, { ownerId: userId }],
        },
      ],
    },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledByUserId: userId,
      cancelReason: normalizedReason,
    },
  });
  if (result.count === 0) {
    throw new RentalError(
      "Can't cancel this rental — check the current status.",
    );
  }
}
