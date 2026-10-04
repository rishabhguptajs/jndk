import type { Metadata } from "next";
import { Chapters } from "@/components/Chapters";

export const metadata: Metadata = { title: "Chapters | J&K Conflict Atlas" };

export default function ChaptersPage() {
  return <Chapters />;
}
