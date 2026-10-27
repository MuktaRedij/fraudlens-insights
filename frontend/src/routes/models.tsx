import { createFileRoute } from "@tanstack/react-router";
import { ModelsPage } from "@/components/pages/intelligence-pages";
export const Route = createFileRoute("/models")({
  head: () => ({
    meta: [
      { title: "Model Intelligence — FraudLens" },
      {
        name: "description",
        content: "Frozen model comparison and probability calibration evidence.",
      },
      { property: "og:title", content: "Model Intelligence — FraudLens" },
      {
        property: "og:description",
        content: "Frozen model comparison and probability calibration evidence.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ModelsPage,
});
