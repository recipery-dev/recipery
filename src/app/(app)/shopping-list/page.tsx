import type { Metadata } from "next";
import { ShoppingListPage } from "@/components/library/shopping-list-page";

export const metadata: Metadata = { title: "Shopping List" };

export default function Page() {
  return <ShoppingListPage />;
}
