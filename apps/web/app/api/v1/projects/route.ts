import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, sourcePath } = body;
  if (!name || !sourcePath) {
    return NextResponse.json({ error: "name and sourcePath required" }, { status: 400 });
  }
  // In real implementation: create project via ClipForgeService
  const id = `proj-${Date.now()}`;
  return NextResponse.json({ projectId: id, name, sourcePath, status: "created" }, { status: 201 });
}

export async function GET() {
  return NextResponse.json({ projects: [], total: 0 });
}
