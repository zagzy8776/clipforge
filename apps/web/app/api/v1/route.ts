import { NextResponse } from "next/server";
import { validateApiKey } from "@clipforge/api";

function checkAuth(request: Request): NextResponse | null {
  const auth = validateApiKey(request.headers.get("authorization"));
  if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: 401 });
  return null;
}

export async function GET(request: Request) {
  const err = checkAuth(request);
  if (err) return err;
  return NextResponse.json({ version: "1.0.0", status: "healthy", endpoints: ["/api/v1/projects", "/api/v1/jobs", "/api/v1/clips"] });
}
