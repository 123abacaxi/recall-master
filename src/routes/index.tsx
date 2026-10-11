import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "OQ lembra — Active Recall para Medicina" },
      { name: "description", content: "Revise com active recall: notas mascaradas que se revelam quando você lembra." },
      { property: "og:title", content: "OQ lembra — Active Recall" },
      { property: "og:description", content: "Revise com active recall: notas que se revelam quando você lembra." },
      { property: "og:image", content: "/logo-oq-med.png" },
      { name: "twitter:image", content: "/logo-oq-med.png" },
    ],
  }),
});
