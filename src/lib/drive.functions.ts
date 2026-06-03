import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const VIDEO_EXT_RE = /\.(mp4|webm|ogg|ogv|mov|m4v|mkv|avi|flv|wmv|3gp|m3u8|mpd)$/i;

function extractFolderId(url: string): string | null {
  const patterns = [
    /\/folders\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // If user pasted just the ID
  if (/^[a-zA-Z0-9_-]{15,}$/.test(url.trim())) return url.trim();
  return null;
}

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  thumbnailUrl?: string;
};

/**
 * Fetches files from a public Google Drive folder using the embedded view HTML
 * (no API key required, works for "anyone with link" folders).
 */
async function fetchPublicFolderFiles(folderId: string): Promise<DriveFile[]> {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; LovableBot/1.0)",
    },
  });
  if (!res.ok) {
    throw new Error(
      `تعذر الوصول إلى المجلد. تأكد أن الرابط عام وأن "أي شخص لديه الرابط" يمكنه عرضه. (HTTP ${res.status})`,
    );
  }
  const html = await res.text();

  // Each file is an anchor like:
  // <a href="https://drive.google.com/file/d/FILE_ID/view?usp=drive_web"
  //    class="flip-entry-title" ...>NAME</a>
  // The whole entry block contains the thumbnail and type icon.
  const entryRe =
    /<div[^>]*class="[^"]*flip-entry[^"]*"[^>]*id="entry-([a-zA-Z0-9_-]+)"[\s\S]*?<div[^>]*class="[^"]*flip-entry-title[^"]*"[^>]*>([^<]+)<\/div>/g;
  const files: DriveFile[] = [];
  let m: RegExpExecArray | null;
  while ((m = entryRe.exec(html))) {
    const id = m[1];
    const name = m[2].trim();
    if (!VIDEO_EXT_RE.test(name)) continue; // only videos
    files.push({
      id,
      name,
      mimeType: guessMime(name),
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${id}&sz=w400`,
    });
  }
  return files;
}

function guessMime(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    ogv: "video/ogg",
    mov: "video/quicktime",
    m4v: "video/x-m4v",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    flv: "video/x-flv",
    wmv: "video/x-ms-wmv",
    "3gp": "video/3gpp",
    m3u8: "application/vnd.apple.mpegurl",
    mpd: "application/dash+xml",
  };
  return map[ext] ?? "video/mp4";
}

function detectContentType(names: string[]): string {
  const text = names.join(" ").toLowerCase();
  if (/(فيلم|movie|film|مسلسل|series|episode|حلقة)/i.test(text)) return "movies";
  if (/(درس|lesson|course|tutorial|محاضرة|شرح)/i.test(text)) return "education";
  if (/(music|أغنية|اغنية|song|كليب|clip)/i.test(text)) return "music";
  if (/(sport|مباراة|كرة|match)/i.test(text)) return "sports";
  if (/(كرتون|انمي|anime|cartoon)/i.test(text)) return "anime";
  return "general";
}

export const setFolder = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ url: z.string().min(5).max(500) }).parse(input),
  )
  .handler(async ({ data }) => {
    const folderId = extractFolderId(data.url);
    if (!folderId) {
      throw new Error("الرابط غير صالح. الرجاء لصق رابط مجلد Google Drive عام.");
    }
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const files = await fetchPublicFolderFiles(folderId);
    const contentType = detectContentType(files.map((f) => f.name));

    const { data: folder, error } = await supabaseAdmin
      .from("folders")
      .upsert(
        {
          drive_folder_id: folderId,
          drive_url: data.url,
          content_type: contentType,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "drive_folder_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);

    if (files.length) {
      const rows = files.map((f) => ({
        folder_id: folder.id,
        drive_file_id: f.id,
        name: f.name,
        mime_type: f.mimeType,
        thumbnail_url: f.thumbnailUrl,
      }));
      const { error: vErr } = await supabaseAdmin
        .from("videos")
        .upsert(rows, { onConflict: "drive_file_id" });
      if (vErr) throw new Error(vErr.message);
    }

    return { folderId: folder.id, count: files.length, contentType };
  });

export const syncCurrentFolder = createServerFn({ method: "POST" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: folder } = await supabaseAdmin
      .from("folders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!folder) return { count: 0, message: "لا يوجد مجلد للمزامنة" };
    const files = await fetchPublicFolderFiles(folder.drive_folder_id);
    const contentType = detectContentType(files.map((f) => f.name));

    if (files.length) {
      const rows = files.map((f) => ({
        folder_id: folder.id,
        drive_file_id: f.id,
        name: f.name,
        mime_type: f.mimeType,
        thumbnail_url: f.thumbnailUrl,
      }));
      await supabaseAdmin
        .from("videos")
        .upsert(rows, { onConflict: "drive_file_id" });
    }
    await supabaseAdmin
      .from("folders")
      .update({
        last_synced_at: new Date().toISOString(),
        content_type: contentType,
      })
      .eq("id", folder.id);
    return { count: files.length, contentType };
  },
);

export const listVideos = createServerFn({ method: "GET" }).handler(
  async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: folder } = await supabaseAdmin
      .from("folders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!folder) return { folder: null, videos: [] as any[] };
    const { data: videos } = await supabaseAdmin
      .from("videos")
      .select("*")
      .eq("folder_id", folder.id)
      .order("created_at", { ascending: false });
    return { folder, videos: videos ?? [] };
  },
);

export const getVideo = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: video } = await supabaseAdmin
      .from("videos")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (!video) throw new Error("الفيديو غير موجود");
    const [{ count: likes }, { count: dislikes }, { count: views }] =
      await Promise.all([
        supabaseAdmin
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("video_id", data.id)
          .eq("type", "like"),
        supabaseAdmin
          .from("interactions")
          .select("*", { count: "exact", head: true })
          .eq("video_id", data.id)
          .eq("type", "dislike"),
        supabaseAdmin
          .from("watch_sessions")
          .select("*", { count: "exact", head: true })
          .eq("video_id", data.id),
      ]);
    const { data: tags } = await supabaseAdmin
      .from("interactions")
      .select("value")
      .eq("video_id", data.id)
      .eq("type", "tag");
    return {
      video,
      stats: {
        likes: likes ?? 0,
        dislikes: dislikes ?? 0,
        views: views ?? 0,
        tags: Array.from(new Set((tags ?? []).map((t) => t.value).filter(Boolean))),
      },
    };
  });

export const recordInteraction = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        visitorKey: z.string().min(5).max(100),
        videoId: z.string().uuid(),
        type: z.enum(["like", "dislike", "tag"]),
        value: z.string().max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: visitor } = await supabaseAdmin
      .from("visitors")
      .upsert({ visitor_key: data.visitorKey }, { onConflict: "visitor_key" })
      .select()
      .single();
    await supabaseAdmin.from("interactions").insert({
      visitor_id: visitor!.id,
      video_id: data.videoId,
      type: data.type,
      value: data.value ?? null,
    });
    return { ok: true };
  });

export const recordWatch = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        visitorKey: z.string().min(5).max(100),
        videoId: z.string().uuid(),
        watchedSeconds: z.number().min(0).max(86400),
        lastPosition: z.number().min(0).max(86400),
        completed: z.boolean(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: visitor } = await supabaseAdmin
      .from("visitors")
      .upsert({ visitor_key: data.visitorKey }, { onConflict: "visitor_key" })
      .select()
      .single();
    await supabaseAdmin.from("watch_sessions").insert({
      visitor_id: visitor!.id,
      video_id: data.videoId,
      ended_at: new Date().toISOString(),
      watched_seconds: data.watchedSeconds,
      last_position: data.lastPosition,
      completed: data.completed,
    });
    return { ok: true };
  });

export const saveSnapshot = createServerFn({ method: "POST" })
  .inputValidator((i) =>
    z
      .object({
        visitorKey: z.string().min(5).max(100),
        videoId: z.string().uuid(),
        position: z.number().min(0),
        imageData: z.string().max(2_000_000),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: visitor } = await supabaseAdmin
      .from("visitors")
      .upsert({ visitor_key: data.visitorKey }, { onConflict: "visitor_key" })
      .select()
      .single();
    await supabaseAdmin.from("snapshots").insert({
      visitor_id: visitor!.id,
      video_id: data.videoId,
      position_seconds: data.position,
      image_data: data.imageData,
    });
    return { ok: true };
  });

export const listSnapshots = createServerFn({ method: "GET" })
  .inputValidator((i) => z.object({ videoId: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: snaps } = await supabaseAdmin
      .from("snapshots")
      .select("*")
      .eq("video_id", data.videoId)
      .order("created_at", { ascending: false })
      .limit(50);
    return { snapshots: snaps ?? [] };
  });

export const getStats = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import(
    "@/integrations/supabase/client.server"
  );
  const { data: videos } = await supabaseAdmin
    .from("videos")
    .select("id, name, thumbnail_url");
  const { data: sessions } = await supabaseAdmin
    .from("watch_sessions")
    .select("video_id, watched_seconds, completed");
  const { data: likes } = await supabaseAdmin
    .from("interactions")
    .select("video_id, type")
    .eq("type", "like");

  const map = new Map<
    string,
    { id: string; name: string; thumb: string | null; views: number; watched: number; likes: number; completed: number }
  >();
  (videos ?? []).forEach((v) =>
    map.set(v.id, {
      id: v.id,
      name: v.name,
      thumb: v.thumbnail_url,
      views: 0,
      watched: 0,
      likes: 0,
      completed: 0,
    }),
  );
  (sessions ?? []).forEach((s) => {
    const e = map.get(s.video_id);
    if (!e) return;
    e.views++;
    e.watched += Number(s.watched_seconds ?? 0);
    if (s.completed) e.completed++;
  });
  (likes ?? []).forEach((l) => {
    const e = map.get(l.video_id);
    if (e) e.likes++;
  });
  return { items: Array.from(map.values()) };
});
