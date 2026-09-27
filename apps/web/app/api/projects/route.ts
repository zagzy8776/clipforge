import { NextResponse } from "next/server";
import { query } from "../../lib/db";

/**
 * GET  /api/projects — List all projects
 * POST /api/projects — Create a new project
 */

async function ensureDemoUser(): Promise<string> {
  const existing = await query<{ id: string }>(
    "SELECT id FROM users WHERE email = 'demo@clipforge.app' LIMIT 1",
  );
  if (existing.rows.length > 0) return existing.rows[0].id;

  const inserted = await query<{ id: string }>(
    "INSERT INTO users (email, name) VALUES ('demo@clipforge.app', 'Demo User') ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email RETURNING id",
  );
  return inserted.rows[0].id;
}

export async function GET() {
  try {
    const userId = await ensureDemoUser();
    const result = await query<{
      id: string; name: string; status: string; config: Record<string, unknown>;
      stats: Record<string, unknown>; created_at: string; updated_at: string;
    }>(
      "SELECT id, name, status, config, stats, created_at, updated_at FROM projects WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
      [userId],
    );

    // Attach clip counts
    const projects = await Promise.all(
      result.rows.map(async (p) => {
        const clips = await query<{ count: string }>(
          "SELECT COUNT(*)::text as count FROM clips WHERE project_id = $1",
          [p.id],
        );
        return {
          id: p.id,
          name: p.name,
          status: p.status,
          clips: parseInt(clips.rows[0]?.count ?? "0", 10),
          stats: p.stats,
          createdAt: p.created_at,
        };
      }),
    );

    return NextResponse.json(projects);
  } catch (err) {
    console.error("GET /api/projects error:", err);
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = await ensureDemoUser();

    const result = await query<{
      id: string; name: string; status: string; created_at: string;
    }>(
      `INSERT INTO projects (user_id, name, status, config)
       VALUES ($1, $2, 'created', $3::jsonb)
       RETURNING id, name, status, created_at`,
      [
        userId,
        body.name || "Untitled Project",
        JSON.stringify({ sourceUrl: body.sourceUrl ?? "", sourcePath: body.sourcePath ?? "" }),
      ],
    );

    const project = result.rows[0];
    return NextResponse.json({
      id: project.id,
      name: project.name,
      status: project.status,
      clips: 0,
      createdAt: project.created_at,
    }, { status: 201 });
  } catch (err) {
    console.error("POST /api/projects error:", err);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
