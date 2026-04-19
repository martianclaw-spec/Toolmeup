import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import Link from "next/link";
import { signIn } from "@/auth";
import { createUser, UserError } from "@/server/users";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  async function action(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    let createError: string | null = null;
    try {
      await createUser({ email, password, name });
    } catch (err) {
      createError =
        err instanceof UserError ? err.message : "Signup failed.";
    }
    if (createError) {
      redirect(`/signup?error=${encodeURIComponent(createError)}`);
    }

    try {
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/",
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect("/login");
      }
      throw err;
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Create account</h1>

      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={action} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            name="name"
            type="text"
            required
            autoComplete="name"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="rounded border border-neutral-300 px-3 py-2"
          />
          <span className="text-xs text-neutral-500">
            At least 8 characters.
          </span>
        </label>
        <button
          type="submit"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Create account
        </button>
      </form>

      <p className="text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Log in
        </Link>
      </p>
    </main>
  );
}
