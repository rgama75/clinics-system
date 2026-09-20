import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "ClinicFlow AI — Gestão inteligente para clínicas" },
      { name: "description", content: "Gestão integrada para clínicas de estética e saúde." },
      { property: "og:title", content: "ClinicFlow AI" },
      {
        property: "og:description",
        content: "Gestão integrada para clínicas de estética e saúde.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => null,
});
