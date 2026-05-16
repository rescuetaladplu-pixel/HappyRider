import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/rider-dashboard")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
