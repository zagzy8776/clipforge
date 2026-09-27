import { NextResponse } from "next/server";

/**
 * GET  /api/projects/[id] — Get project details
 * PATCH /api/projects/[id] — Update project
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    id,
    name: "Project " + id,
    status: "created",
    sourcePath: "",
    segments: [],
    sections: [],
    candidates: [],
    clips: [],
    stats: { totalCandidates: 0, selectedClips: 0, validatedClips: 0, avgEngagement: 0, avgQuality: 0, totalRenderTimeMs: 0, totalSizeMB: 0 },
    createdAt: new Date().toISOString(),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return NextResponse.json({ id, ...body, updatedAt: new Date().toISOString() });
}
