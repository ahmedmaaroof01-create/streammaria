import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  visitorKey: z.string().min(3).max(120),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(40),
});

function ageInYearsFrom(date: Date) {
  const diff = Date.now() - date.getTime();
  return diff / (365.25 * 24 * 3600 * 1000);
}

const MARIA_BIRTH = new Date("2002-06-06T00:00:00Z"); // exactly 24 years from 2026-06-06

const SYSTEM = () => {
  const age = ageInYearsFrom(MARIA_BIRTH).toFixed(2);
  return `أنتِ "ماريا"، فتاة عراقية عمرها ${age} سنة (تُحدَّث تلقائياً). تتكلمين بلهجة عراقية بغدادية أصيلة وحميمية. شخصيتك دافئة وذكية وودودة، تحبين السينما وتساعدين المستخدم باختيار أفلام تناسب مزاجه من المنصة (اسمها "ماريا").
- تكلمي دائماً باللهجة العراقية: "هلا، شلونك، اشتحب، شنو رايك، خوش، يلا، ماكو مشكلة".
- لا تكشفي أنكِ ذكاء اصطناعي إلا إذا طلب المستخدم صراحة.
- اقترحي أفلام أو وجّهي المستخدم لاستخدام السلايدر بالصفحة الرئيسية.
- ردودك قصيرة، دافئة، وبتفاعل حقيقي.`;
};

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch (e: any) {
          return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 });
        }

        // persist visitor + user message (best effort)
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: visitor } = await supabaseAdmin
          .from("visitors")
          .upsert({ visitor_key: parsed.visitorKey }, { onConflict: "visitor_key" })
          .select()
          .single();

        // block check
        if (visitor) {
          const { data: blocked } = await supabaseAdmin
            .from("blocked_visitors")
            .select("visitor_id")
            .eq("visitor_id", visitor.id)
            .maybeSingle();
          if (blocked) {
            return new Response(
              JSON.stringify({ error: "blocked" }),
              { status: 403, headers: { "content-type": "application/json" } },
            );
          }
        }

        const lastUser = parsed.messages[parsed.messages.length - 1];
        if (visitor && lastUser?.role === "user") {
          await supabaseAdmin.from("chat_messages").insert({
            visitor_id: visitor.id,
            role: "user",
            content: lastUser.content,
          });
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Server misconfigured", { status: 500 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            stream: true,
            messages: [{ role: "system", content: SYSTEM() }, ...parsed.messages],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text();
          return new Response(`AI error: ${t}`, { status: 502 });
        }

        // Tee the stream to collect full assistant text and save it
        const [a, b] = upstream.body.tee();
        (async () => {
          try {
            const reader = b.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            let full = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() ?? "";
              for (const ln of lines) {
                if (!ln.startsWith("data:")) continue;
                const data = ln.slice(5).trim();
                if (data === "[DONE]") continue;
                try {
                  const j = JSON.parse(data);
                  const delta = j.choices?.[0]?.delta?.content;
                  if (delta) full += delta;
                } catch {}
              }
            }
            if (visitor && full) {
              await supabaseAdmin.from("chat_messages").insert({
                visitor_id: visitor.id,
                role: "assistant",
                content: full,
              });
            }
          } catch {}
        })();

        return new Response(a, {
          headers: {
            "content-type": "text/event-stream",
            "cache-control": "no-cache",
          },
        });
      },
    },
  },
});
