import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export class ReviewError extends Error {}

export type CreateReviewInput = {
  rentalId: string;
  authorId: string;
  rating: number;
  comment: string | null;
};

export async function createReview(input: CreateReviewInput) {
  if (
    !Number.isInteger(input.rating) ||
    input.rating < 1 ||
    input.rating > 5
  ) {
    throw new ReviewError("Rating must be between 1 and 5.");
  }

  // Fetch the rental with status + participant info. The WHERE clause
  // gates on: rental exists, is COMPLETED, and author is a participant.
  // If the row doesn't match, we bail before any write.
  const rental = await prisma.rentalRequest.findFirst({
    where: {
      id: input.rentalId,
      status: "COMPLETED",
      OR: [{ renterId: input.authorId }, { ownerId: input.authorId }],
    },
    select: { id: true, renterId: true, ownerId: true },
  });
  if (!rental) {
    throw new ReviewError(
      "You can only review rentals you took part in that are completed.",
    );
  }

  // Subject is whichever participant isn't the author.
  const subjectId =
    input.authorId === rental.renterId ? rental.ownerId : rental.renterId;

  // Defensive — should be impossible given rental creation rules.
  if (subjectId === input.authorId) {
    throw new ReviewError("You can't review yourself.");
  }

  const comment = (input.comment ?? "").trim() || null;

  try {
    return await prisma.review.create({
      data: {
        rentalRequestId: rental.id,
        authorId: input.authorId,
        subjectId,
        rating: input.rating,
        comment,
      },
      select: { id: true },
    });
  } catch (err) {
    // @@unique([rentalRequestId, authorId]) — one review per author per rental.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ReviewError("You've already reviewed this rental.");
    }
    throw err;
  }
}

export async function getReviewsForRental(rentalRequestId: string) {
  return prisma.review.findMany({
    where: { rentalRequestId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      authorId: true,
      subjectId: true,
      author: { select: { id: true, name: true } },
      subject: { select: { id: true, name: true } },
    },
  });
}

export async function getReviewsForUser(userId: string) {
  return prisma.review.findMany({
    where: { subjectId: userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
      author: { select: { id: true, name: true } },
    },
  });
}
