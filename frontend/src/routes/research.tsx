import { createFileRoute } from "@tanstack/react-router";
import { ResearchPage } from "@/components/pages/intelligence-pages";
export const Route = createFileRoute("/research")({
  head: () => ({
    meta: [
      { title: "Research & Evaluation — FraudLens" },
      {
        name: "description",
        content: "FraudLens architecture, datasets, frozen metrics, and research principles.",
      },
      { property: "og:title", content: "Research & Evaluation — FraudLens" },
      {
        property: "og:description",
        content: "FraudLens architecture, datasets, frozen metrics, and research principles.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResearchPage,
});
