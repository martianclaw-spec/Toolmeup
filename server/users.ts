import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export type CreateUserInput = {
  email: string;
  password: string;
  name: string;
};

export class UserError extends Error {}

export async function createUser({ email, password, name }: CreateUserInput) {
  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  if (!normalizedEmail || !trimmedName) {
    throw new UserError("Email and name are required.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new UserError("Enter a valid email address.");
  }
  if (password.length < 8) {
    throw new UserError("Password must be at least 8 characters.");
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existing) {
    throw new UserError("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      email: normalizedEmail,
      passwordHash,
      name: trimmedName,
    },
    select: { id: true, email: true, name: true },
  });
}

// Public profile fields — safe to surface to anonymous viewers.
// Deliberately excludes email, passwordHash, lat/lng etc.
export async function getPublicProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      city: true,
      photoUrl: true,
      createdAt: true,
    },
  });
}
