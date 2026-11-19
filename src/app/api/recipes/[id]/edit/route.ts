import { NextResponse } from "next/server";
import { parseRecipeForm } from "@/lib/recipes/form";
import { serviceErrorResponse } from "@/lib/recipes/http";
import { getRecipeRecord, updateRecipe } from "@/lib/recipes/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await getRecipeRecord(id);
    const parsed = await parseRecipeForm(await request.formData());
    if (!parsed) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    const recipe = await updateRecipe(id, parsed.fields, parsed.images);
    return NextResponse.json({ recipe });
  } catch (error) {
    return serviceErrorResponse(error);
  }
}
