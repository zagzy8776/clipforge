import { NextResponse } from "next/server";

/**
 * POST /api/projects — Create a new project
 * GET  /api/projects — List all projects
 */

// In-memory store for MVP. Replace with DB in M6.
const projects = new Map<string, {
  id: string; name: string; sourcePath: string; status: string;
  clips: unknown[]; createdAt: string;
}>();

export async function GET() {
  return NextResponse.json(Array.from(projects.values()));
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = `proj-${Date.now()}`;
  const project = {
    id,
    name: body.name ?? "Untitled Project",
    sourcePath: body.sourcePath ?? "",
    sourceUrl: body.sourceUrl,
    status: "created",
    clips: [],
    createdAt: new Date().toISOString(),
  };
  projects.set(id, project);
  return NextResponse.json(project, { status: 201 });
}
