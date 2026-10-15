import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/items/$id")({
  component: () => <Outlet />,
});
