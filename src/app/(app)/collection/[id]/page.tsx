import type { Metadata } from "next";
import { getActiveProfile } from "@/lib/profiles/store";
import { listCollections } from "@/lib/collections/store";
import { CollectionPage } from "@/components/library/collection-page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const profile = await getActiveProfile();
  const collections = await listCollections(profile.id);
  const collection = collections.find((c) => c.id === id);
  return { title: collection?.name ?? "Collection" };
}

export default function Page() {
  return <CollectionPage />;
}
