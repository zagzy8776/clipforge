import { NextResponse } from "next/server";
import { registerUser } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();
    if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    const { user, session } = await registerUser(email, password, name);
    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name }, token: session.token });
    response.cookies.set("session", session.token, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 7 * 24 * 60 * 60 });
    return response;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Registration failed" }, { status: 409 });
  }
}
