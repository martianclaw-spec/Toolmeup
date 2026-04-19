import { NextResponse } from "next/server";
import { createUser, UserError } from "@/server/users";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { email, password, name } = (body ?? {}) as Record<string, unknown>;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof name !== "string"
  ) {
    return NextResponse.json(
      { error: "email, password, and name are required." },
      { status: 400 },
    );
  }

  try {
    const user = await createUser({ email, password, name });
    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof UserError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("signup failed:", err);
    return NextResponse.json({ error: "Signup failed." }, { status: 500 });
  }
}
