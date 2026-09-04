import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/go/$assignmentId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { handleGoRedirect } = await import("@/lib/server/helpers.server");
        return handleGoRedirect(params.assignmentId);
      },
    },
  },
});
