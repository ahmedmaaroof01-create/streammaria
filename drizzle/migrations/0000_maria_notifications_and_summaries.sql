ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS ai_summary TEXT;

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  dedupe_key TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx
  ON public.notifications (visitor_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS notifications_visitor_idx
  ON public.notifications (visitor_id, created_at DESC);

GRANT SELECT ON public.notifications TO anon;
GRANT SELECT ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read notifications" ON public.notifications
  FOR SELECT TO public USING (true);