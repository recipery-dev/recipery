import { NextResponse } from "next/server";
import { serviceErrorResponse } from "@/lib/recipes/http";
import { duplicateRecipe } from "@/lib/recipes/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    return NextResponse.json({ recipe: await duplicateRecipe(id) }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
