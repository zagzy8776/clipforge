import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Creates processing job — returns immediately with jobId
  return NextResponse.json({
    jobId: `job-${Date.now()}`,
    projectId: id,
    status: "queued",
    message: "Processing started",
    estimatedDurationSeconds: 120,
  }, { status: 202 });
}
