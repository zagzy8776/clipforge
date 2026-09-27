import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: "1.0.0",
    status: "healthy",
    endpoints: ["/api/v1/projects", "/api/v1/jobs", "/api/v1/clips"],
  });
}
