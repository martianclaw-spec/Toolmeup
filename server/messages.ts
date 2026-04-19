import { prisma } from "@/lib/db";

export class MessageError extends Error {}

export async function getMessagesForRental(rentalRequestId: string) {
  return prisma.message.findMany({
    where: { rentalRequestId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      body: true,
      createdAt: true,
      senderId: true,
      sender: { select: { id: true, name: true } },
    },
  });
}

export async function createMessage(
  rentalRequestId: string,
  senderId: string,
  body: string,
) {
  const trimmed = body.trim();
  if (!trimmed) throw new MessageError("Message can't be empty.");
  if (trimmed.length > 2000) {
    throw new MessageError("Message is too long (max 2000 characters).");
  }

  // Verify the sender is a participant in this rental before inserting.
  // The Message model has no direct ownership column, so we guard here.
  const rental = await prisma.rentalRequest.findFirst({
    where: {
      id: rentalRequestId,
      OR: [{ renterId: senderId }, { ownerId: senderId }],
    },
    select: { id: true },
  });
  if (!rental) {
    throw new MessageError("You can't post messages on this rental.");
  }

  return prisma.message.create({
    data: {
      rentalRequestId,
      senderId,
      body: trimmed,
    },
    select: { id: true },
  });
}
