import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET() {
  try {
    const setting = await prisma.adminSettings.findUnique({
      where: { key: "snowEnabled" },
    })
    return NextResponse.json({ enabled: setting?.value === "true" })
  } catch {
    return NextResponse.json({ enabled: false })
  }
}
