import type { Metadata } from "next";
import { getActiveProfile } from "@/lib/profiles/store";
import { listCollections } from "@/lib/collections/store";
import { computeSmartCollections } from "@/lib/collections/smart";
import { CollectionPage } from "@/components/library/collection-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getActiveProfile();
  const collections = await listCollections(profile.id);
  // Smart collection names are static — no need for the real recipe list
  // just to resolve a page title.
  const collection =
    collections.find((c) => c.id === id) ??
    computeSmartCollections([]).find((c) => c.id === id);
  return { title: collection?.name ?? "Collection" };
}

export default function Page() {
  return <CollectionPage />;
}
