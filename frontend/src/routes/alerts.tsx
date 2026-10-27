import { createFileRoute } from "@tanstack/react-router";
import { AlertsPage } from "@/components/pages/operations-pages";
export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Fraud Alerts — FraudLens" },
      { name: "description", content: "Triage synthetic fraud alerts and analyst investigations." },
      { property: "og:title", content: "Fraud Alerts — FraudLens" },
      {
        property: "og:description",
        content: "Triage synthetic fraud alerts and analyst investigations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertsPage,
});
