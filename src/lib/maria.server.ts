/**
 * Server-only helper: one-shot text generation through Lovable AI Gateway.
 * Uses the Responses API with streaming (required) but consumes the stream
 * server-side and returns the final text.
 */
export async function mariaGenerate(opts: {
  instructions: string;
  input: string;
  effort?: "low" | "medium";
}): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: opts.instructions,
      input: opts.input,
      stream: true,
      store: false,
      reasoning: { effort: opts.effort ?? "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
    }),
  });

  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`AI error ${res.status}: ${t.slice(0, 300)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let out = "";
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
          out += j.delta;
        } else if (j.type === "response.completed" && !out) {
          const txt = j.response?.output_text;
          if (typeof txt === "string") out = txt;
        }
      } catch {
        /* ignore partial json */
      }
    }
  }
  return out.trim();
}

export function cleanTitle(name: string) {
  return name.replace(/\.[a-z0-9]{2,4}$/i, "").replace(/[._]+/g, " ").trim();
}
