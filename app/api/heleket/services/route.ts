import { NextResponse } from "next/server"
import { getServices } from "@/lib/heleket"

export async function GET() {
  try {
    const services = await getServices()
    return NextResponse.json(services)
  } catch (error) {
    console.error("Heleket services error:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}
