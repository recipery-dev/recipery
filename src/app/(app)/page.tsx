import type { Metadata } from "next";
import { LibraryPage } from "@/components/library/library-page";

// Overrides the root layout's plain "Recipery" title on the homepage only
// — other routes (Favorites, Settings, ...) keep inheriting it.
export const metadata: Metadata = {
  title: "Recipery - A self-hosted recipe library",
};

export default function Page() {
  return <LibraryPage />;
}
