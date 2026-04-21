import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "toolmeup — rent tools from neighbors",
    template: "%s · toolmeup",
  },
  description: "A local marketplace for renting and borrowing tools.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  const user = session?.user
    ? { id: session.user.id, name: session.user.name }
    : null;

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b border-neutral-200 bg-white">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm">
            <Link
              href="/"
              aria-label="toolmeup — home"
              className="mr-auto flex items-baseline font-extrabold tracking-tight text-lg leading-none transition-opacity hover:opacity-80"
            >
              <span className="text-neutral-900">tool</span>
              <span className="text-amber-600">meup</span>
            </Link>

            {user ? (
              <>
                <Link
                  href="/listings/new"
                  className="text-neutral-700 underline-offset-2 hover:underline"
                >
                  List a tool
                </Link>
                <Link
                  href="/dashboard/listings"
                  className="text-neutral-700 underline-offset-2 hover:underline"
                >
                  My listings
                </Link>
                <Link
                  href="/dashboard/rentals"
                  className="text-neutral-700 underline-offset-2 hover:underline"
                >
                  My rentals
                </Link>
                <Link
                  href="/dashboard/requests"
                  className="text-neutral-700 underline-offset-2 hover:underline"
                >
                  Incoming requests
                </Link>
                <Link
                  href={`/profile/${user.id}`}
                  className="font-medium text-neutral-900 underline-offset-2 hover:underline"
                >
                  {user.name}
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-neutral-700 underline-offset-2 hover:underline"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-neutral-700 underline-offset-2 hover:underline"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="text-neutral-700 underline-offset-2 hover:underline"
                >
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>

        {children}
        <Analytics />
      </body>
    </html>
  );
}
