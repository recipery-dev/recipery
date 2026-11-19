import { NextResponse } from "next/server";
import { serviceErrorResponse } from "@/lib/recipes/http";
import { discoverRecipes } from "@/lib/recipes/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    // Both Discover and Find Similar show one unified feed, not per-source tabs.
    return NextResponse.json({ results: await discoverRecipes(searchParams.get("q") ?? undefined) });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
