import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

// Fetch the current user row from the database based on the active session.
// Returns null for anonymous visitors. Use this in server components, route
// handlers, and server actions — never in client components (calls Prisma).

export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      photoUrl: true,
      bio: true,
      city: true,
    },
  });
}

// Use in pages and server actions that require an authenticated user.
// Redirects to /login when anonymous; the caller can assume a user is present.
// For JSON API routes, check getCurrentUser() manually and return 401 instead.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
