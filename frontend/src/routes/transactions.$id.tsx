import { createFileRoute } from "@tanstack/react-router";
import { TransactionDetailsPage } from "@/components/pages/operations-pages";

function TransactionDetailsRoute() {
  const { id } = Route.useParams();
  return <TransactionDetailsPage id={id} />;
}

export const Route = createFileRoute("/transactions/$id")({
  head: () => ({
    meta: [
      { title: "Transaction Investigation — FraudLens" },
      {
        name: "description",
        content: "Review transaction risk, model explanations, and analyst feedback.",
      },
      { property: "og:title", content: "Transaction Investigation — FraudLens" },
      {
        property: "og:description",
        content: "Review transaction risk, model explanations, and analyst feedback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TransactionDetailsRoute,
});
