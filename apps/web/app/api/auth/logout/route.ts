import { NextResponse } from "next/server";
import { destroySession } from "../../../lib/auth";

export async function POST(request: Request) {
  const token = request.cookies.get("session")?.value;
  if (token) destroySession(token);
  const response = NextResponse.json({ message: "Logged out" });
  response.cookies.set("session", "", { httpOnly: true, maxAge: 0 });
  return response;
}
