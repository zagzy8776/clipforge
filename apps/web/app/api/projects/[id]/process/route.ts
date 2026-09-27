import { NextResponse } from "next/server";
import { query } from "../../../../../lib/db";

/**
 * POST /api/projects/[id]/process — Start processing a project
 * 1. Verify project exists
 * 2. Create a job in PostgreSQL
 * 3. Try to enqueue to Redis (worker on Fly.io picks it up)
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Verify project exists
    const projResult = await query<{ id: string; status: string }>(
      "SELECT id, status FROM projects WHERE id = $1",
      [id],
    );

    if (projResult.rows.length === 0) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const project = projResult.rows[0];
    if (project.status === "processing") {
      return NextResponse.json({ error: "Project is already being processed" }, { status: 409 });
    }

    // Create a job in PostgreSQL
    const jobResult = await query<{ id: string }>(
      `INSERT INTO jobs (project_id, type, status, progress, message)
       VALUES ($1, 'process', 'queued', 0, 'Waiting for worker...')
       RETURNING id`,
      [id],
    );

    const jobId = jobResult.rows[0].id;

    // Update project status
    await query(
      "UPDATE projects SET status = 'processing', updated_at = now() WHERE id = $1",
      [id],
    );

    // Try to enqueue to Redis — don't fail if Redis is down
    try {
      const { enqueueJob } = await import("../../../../../lib/queue");
      await enqueueJob({
        jobId,
        projectId: id,
        type: "process",
        payload: { projectName: project.id },
      });
    } catch (redisErr) {
      console.warn("Redis enqueue failed (job still in PG):", redisErr);
      // Update job message so frontend shows the issue
      await query(
        "UPDATE jobs SET message = 'Queued in DB. Waiting for Redis connection.' WHERE id = $1",
        [jobId],
      );
    }

    return NextResponse.json({
      jobId,
      projectId: id,
      status: "queued",
      message: "Job created and queued for processing",
    }, { status: 202 });
  } catch (err) {
    console.error("POST /api/projects/[id]/process error:", err);
    return NextResponse.json(
      { error: "Failed to start processing", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
