import { NextResponse } from "next/server";
import { loginUser } from "@clipforge/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const session = await loginUser(email, password);
    const response = NextResponse.json({
      user: session.user,
      token: session.token,
    });
    response.cookies.set("session", session.token, {
      httpOnly: true, secure: true, sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
