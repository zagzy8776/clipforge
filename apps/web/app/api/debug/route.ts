import { NextResponse } from "next/server";
import { testConnection } from "../../../lib/db";
import { testRedis } from "../../../lib/queue";

/**
 * GET /api/debug — Check DB and Redis connectivity (remove in production)
 */
export async function GET() {
  const dbOk = await testConnection();
  const redisResult = await testRedis();

  return NextResponse.json({
    database: { connected: dbOk },
    redis: { connected: redisResult.connected, error: redisResult.error },
    redisUrl: process.env.REDIS_URL ? `set (${process.env.REDIS_URL.split("@")[1] ?? "parsed"})` : "NOT SET",
    databaseUrl: process.env.DATABASE_URL ? "set" : "NOT SET",
  });
}
