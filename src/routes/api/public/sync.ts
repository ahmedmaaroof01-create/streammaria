import { createFileRoute } from "@tanstack/react-router";
import { syncCurrentFolder } from "@/lib/drive.functions";

export const Route = createFileRoute("/api/public/sync")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await syncCurrentFolder();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          return Response.json(
            { ok: false, error: e?.message ?? "error" },
            { status: 500 },
          );
        }
      },
      GET: async () => {
        const result = await syncCurrentFolder();
        return Response.json({ ok: true, ...result });
      },
    },
  },
});
