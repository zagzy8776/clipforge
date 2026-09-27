import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return NextResponse.json({
    clips: [
      { id: `${id}-clip-1`, rank: 1, score: 46, title: "Adoption story", status: "validated" },
      { id: `${id}-clip-2`, rank: 2, score: 36, title: "College detail", status: "validated" },
    ],
    total: 2,
  });
}
