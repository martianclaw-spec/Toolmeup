import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { auth, signOut } from "@/auth";
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
  title: "For whom the bell Tools",
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
              className="mr-auto text-base font-semibold tracking-tight"
            >
              For whom the bell Tools
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
      </body>
    </html>
  );
}
