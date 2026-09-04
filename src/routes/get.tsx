import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/get")({
  component: () => <Outlet />,
});
