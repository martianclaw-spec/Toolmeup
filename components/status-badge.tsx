import type { ListingStatus, RentalStatus } from "@prisma/client";

// Tailwind classes per status. Intent:
//   amber  → user action needed / paused
//   green  → positive / live
//   blue   → in progress
//   purple → transitional (returned but not closed)
//   red    → declined (the owner said no)
//   neutral→ closed states (completed, cancelled, deleted)
// Keeping these as flat objects so the mapping is easy to skim.

const BASE =
  "whitespace-nowrap rounded border px-2 py-0.5 text-xs font-medium";

const RENTAL_LABEL: Record<RentalStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  DECLINED: "Declined",
  ACTIVE: "Active",
  RETURNED: "Returned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const RENTAL_STYLE: Record<RentalStatus, string> = {
  REQUESTED: "border-amber-300 bg-amber-50 text-amber-800",
  APPROVED: "border-green-300 bg-green-50 text-green-800",
  DECLINED: "border-red-300 bg-red-50 text-red-700",
  ACTIVE: "border-blue-300 bg-blue-50 text-blue-800",
  RETURNED: "border-purple-300 bg-purple-50 text-purple-800",
  COMPLETED: "border-neutral-400 bg-neutral-100 text-neutral-800",
  CANCELLED: "border-neutral-300 bg-neutral-50 text-neutral-600",
};

const LISTING_LABEL: Record<ListingStatus, string> = {
  ACTIVE: "Active",
  PAUSED: "Paused",
  DELETED: "Deleted",
};

const LISTING_STYLE: Record<ListingStatus, string> = {
  ACTIVE: "border-green-300 bg-green-50 text-green-800",
  PAUSED: "border-amber-300 bg-amber-50 text-amber-800",
  DELETED: "border-neutral-300 bg-neutral-50 text-neutral-600",
};

export function RentalStatusBadge({ status }: { status: RentalStatus }) {
  return (
    <span className={`${BASE} ${RENTAL_STYLE[status]}`}>
      {RENTAL_LABEL[status]}
    </span>
  );
}

export function ListingStatusBadge({ status }: { status: ListingStatus }) {
  return (
    <span className={`${BASE} ${LISTING_STYLE[status]}`}>
      {LISTING_LABEL[status]}
    </span>
  );
}
