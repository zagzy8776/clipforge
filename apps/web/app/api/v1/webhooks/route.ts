import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { url, projectId } = body;
  if (!url || !projectId) {
    return NextResponse.json({ error: "url and projectId required" }, { status: 400 });
  }
  return NextResponse.json({ webhookId: `wh-${Date.now()}`, url, projectId, status: "registered" }, { status: 201 });
}
