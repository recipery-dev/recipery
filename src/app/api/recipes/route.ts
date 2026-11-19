import { NextResponse } from "next/server";
import { parseRecipeForm } from "@/lib/recipes/form";
import { serviceErrorResponse } from "@/lib/recipes/http";
import { createRecipe, listRecipeRecords } from "@/lib/recipes/service";

export async function GET() {
  return NextResponse.json({ recipes: await listRecipeRecords() });
}

export async function POST(request: Request) {
  const parsed = await parseRecipeForm(await request.formData());
  if (!parsed) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  try {
    const recipe = await createRecipe(parsed.fields, parsed.images);
    return NextResponse.json({ recipe }, { status: 201 });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
