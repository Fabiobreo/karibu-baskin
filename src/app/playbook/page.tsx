import { redirect } from "next/navigation";
import { categoryPath } from "@/lib/board/category";

/** `/playbook` apre gli esercizi, la parte che vedono tutti (UX-72). */
export default function PlaybookPage() {
  redirect(categoryPath("exercises"));
}
