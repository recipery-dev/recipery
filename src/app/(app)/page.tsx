import type { Metadata } from "next";
import { LibraryPage } from "@/components/library/library-page";

// `absolute` bypasses the root layout's "%s - Recipery" template — every
// other route just sets a plain `title` string and gets that template
// applied automatically.
export const metadata: Metadata = {
  title: { absolute: "Recipery - A self-hosted recipe library" },
};

export default function Page() {
  return <LibraryPage />;
}
