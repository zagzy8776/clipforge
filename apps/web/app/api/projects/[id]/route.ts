import { NextResponse } from "next/server";
import { query } from "../../../lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const projResult = await query<{
      id: string; name: string; status: string; config: Record<string, unknown>;
      stats: Record<string, unknown>; created_at: string;
    }>(
      "SELECT id, name, status, config, stats, created_at FROM projects WHERE id = $1",
      [id],
    );

    if (projResult.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projResult.rows[0];

    const clipsResult = await query<{
      id: string; rank: number; title: string; hook: string; score: number;
      source_start: number; source_end: number; duration_seconds: number;
      status: string; profile_name: string;
    }>(
      `SELECT id, rank, title, hook, score, source_start, source_end,
              duration_seconds, status, profile_name
       FROM clips WHERE project_id = $1 ORDER BY rank ASC NULLS LAST`,
      [id],
    );

    const jobsResult = await query<{
      id: string; type: string; status: string; progress: number;
      message: string; created_at: string; completed_at: string;
    }>(
      `SELECT id, type, status, progress, message, created_at, completed_at
       FROM jobs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [id],
    );

    const stats = (project.stats ?? {}) as Record<string, unknown>;

    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
      config: project.config,
      clips: clipsResult.rows.map((c) => ({
        id: c.id,
        rank: c.rank,
        title: c.title ?? `Clip ${c.rank}`,
        hook: c.hook,
        score: c.score,
        sourceStart: c.source_start,
        sourceEnd: c.source_end,
        duration: c.duration_seconds,
        status: c.status,
        profile: c.profile_name,
      })),
      jobs: jobsResult.rows.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        progress: j.progress,
        message: j.message,
        createdAt: j.created_at,
        completedAt: j.completed_at,
      })),
      stats: {
        totalCandidates: stats.totalCandidates ?? 0,
        selectedClips: clipsResult.rows.length,
        avgEngagement: stats.avgEngagement ?? 0,
        avgQuality: stats.avgQuality ?? 0,
      },
      createdAt: project.created_at,
    });
  } catch (err) {
    console.error("GET /api/projects/[id] error:", err);
    return NextResponse.json({ error: "Failed to load project" }, { status: 500 });
  }
}
