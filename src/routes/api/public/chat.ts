import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  visitorKey: z.string().min(3).max(120),
  currentVideoId: z.string().uuid().nullable().optional(),
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
  return (Date.now() - date.getTime()) / (365.25 * 24 * 3600 * 1000);
}

const MARIA_BIRTH = new Date("2002-06-06T00:00:00Z");

function cleanTitle(name: string) {
  return name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[._]+/g, " ").trim();
}

const SYSTEM = (catalog: string, current: string | null) => {
  const age = ageInYearsFrom(MARIA_BIRTH).toFixed(2);
  return `أنتِ "ماريا"، فتاة عراقية عمرها ${age} سنة. تتكلمين بلهجة عراقية بغدادية أصيلة ودافئة، وتحبين السينما وتساعدين المستخدم يختار فيلم من منصة "ماريا".

قواعد مهمة:
- تعرفين أفلام المنصة من القائمة أدناه فقط. لا تقترحي ولا تذكري أي فيلم غير موجود بالقائمة. إذا ماكو فيلم مناسب، قولي بصراحة بلهجتك.
- عند اقتراح أو ذكر فيلم من المنصة، اكتبيه كرابط ماركداون بهذا الشكل بالضبط: [اسم الفيلم](/watch/المعرّف) — استخدمي المعرّف من القائمة.
- إذا سألك المستخدم عن الفيلم اللي يشاهده، اشرحيه باختصار وبلا حرق نهاية.
- ردودك قصيرة، دافئة، وبتفاعل حقيقي. لا تكشفي أنكِ ذكاء اصطناعي إلا إذا طلب صراحة.

${current ? `الفيلم اللي يشاهده المستخدم حالياً: ${current}` : "المستخدم مو داخل أي فيلم حالياً."}

أفلام المنصة (الاسم :: المعرّف):
${catalog}`;
};

export const Route = createFileRoute("/api/public/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let parsed;
        try {
          parsed = Body.parse(await request.json());
        } catch {
          return new Response(JSON.stringify({ error: "Invalid body" }), { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: visitor } = await supabaseAdmin
          .from("visitors")
          .upsert({ visitor_key: parsed.visitorKey }, { onConflict: "visitor_key" })
          .select()
          .single();

        if (visitor) {
          const { data: blocked } = await supabaseAdmin
            .from("blocked_visitors")
            .select("visitor_id")
            .eq("visitor_id", visitor.id)
            .maybeSingle();
          if (blocked) {
            return new Response(JSON.stringify({ error: "blocked" }), {
              status: 403,
              headers: { "content-type": "application/json" },
            });
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

        // Ground Maria in the platform catalogue only.
        const { data: catalogRows } = await supabaseAdmin
          .from("videos")
          .select("id, name, ai_summary")
          .order("created_at", { ascending: false })
          .limit(150);
        const catalog = (catalogRows ?? [])
          .map((v) => `${cleanTitle(v.name)} :: ${v.id}`)
          .join("\n");

        let current: string | null = null;
        if (parsed.currentVideoId) {
          const { data: cur } = await supabaseAdmin
            .from("videos")
            .select("id, name, ai_summary")
            .eq("id", parsed.currentVideoId)
            .maybeSingle();
          if (cur) {
            current = `${cleanTitle(cur.name)} (/watch/${cur.id})${
              cur.ai_summary ? `\nنبذة محفوظة: ${cur.ai_summary}` : ""
            }`;
          }
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Server misconfigured", { status: 500 });

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: SYSTEM(catalog, current),
            input: parsed.messages.map((m) => ({
              role: m.role,
              content: [
                {
                  type: m.role === "assistant" ? "output_text" : "input_text",
                  text: m.content,
                },
              ],
            })),
            stream: true,
            store: false,
            reasoning: { effort: "low", summary: "auto" },
            include: ["reasoning.encrypted_content"],
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => "");
          return new Response(`AI error: ${t.slice(0, 300)}`, { status: 502 });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let full = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            let buf = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() ?? "";
                for (const ln of lines) {
                  if (!ln.startsWith("data:")) continue;
                  const raw = ln.slice(5).trim();
                  if (!raw || raw === "[DONE]") continue;
                  try {
                    const j = JSON.parse(raw);
                    if (j.type === "response.output_text.delta" && typeof j.delta === "string") {
                      full += j.delta;
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ delta: j.delta })}\n\n`),
                      );
                    }
                  } catch {
                    /* partial json */
                  }
                }
              }
              if (!full) {
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({ delta: "عفواً، ما طلع عندي جواب هذه المرة. جرّب مرة ثانية." })}\n\n`,
                  ),
                );
              }
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            } catch (e) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta: "\n(انقطع الاتصال)" })}\n\n`),
              );
            } finally {
              controller.close();
              if (visitor && full) {
                await supabaseAdmin
                  .from("chat_messages")
                  .insert({ visitor_id: visitor.id, role: "assistant", content: full });
              }
            }
          },
        });

        return new Response(stream, {
          headers: { "content-type": "text/event-stream", "cache-control": "no-cache" },
        });
      },
    },
  },
});
