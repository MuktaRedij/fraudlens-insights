import { Outlet, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/transactions")({ component: () => <Outlet /> });