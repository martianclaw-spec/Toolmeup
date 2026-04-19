import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicProfile } from "@/server/users";
import { getReviewsForUser } from "@/server/reviews";

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, reviews] = await Promise.all([
    getPublicProfile(id),
    getReviewsForUser(id),
  ]);
  if (!profile) notFound();

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
          {profile.name}
        </h1>
        <p className="text-sm text-neutral-500">
          {profile.city ? `${profile.city} · ` : ""}Member since{" "}
          {formatDate(profile.createdAt)}
        </p>
      </header>

      {profile.bio && (
        <p className="whitespace-pre-wrap text-sm text-neutral-800">
          {profile.bio}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium text-neutral-700">Reviews</h2>

        {reviews.length === 0 ? (
          <p className="text-sm text-neutral-500">
            No reviews yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="rounded border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-800"
              >
                <p className="mb-1 text-xs text-neutral-500">
                  <Link
                    href={`/profile/${r.author.id}`}
                    className="underline underline-offset-2"
                  >
                    {r.author.name}
                  </Link>{" "}
                  · {r.rating} / 5 · {formatDate(r.createdAt)}
                </p>
                {r.comment && (
                  <p className="whitespace-pre-wrap">{r.comment}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
