import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    jobId: id,
    status: "completed",
    progress: 100,
    message: "Pipeline completed",
    artifacts: ["clip-01.mp4", "clip-02.mp4"],
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  });
}
