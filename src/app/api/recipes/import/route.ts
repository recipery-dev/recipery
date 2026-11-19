import { NextResponse } from "next/server";
import { serviceErrorResponse } from "@/lib/recipes/http";
import { importRecipeFromUrl } from "@/lib/recipes/service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { url?: string };
  try {
    return NextResponse.json({ recipe: await importRecipeFromUrl(body.url ?? "") }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
