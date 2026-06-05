
CREATE TABLE public.video_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL,
  start_seconds numeric NOT NULL DEFAULT 0,
  end_seconds numeric,
  title text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chapters_video ON public.video_chapters(video_id);
GRANT SELECT ON public.video_chapters TO anon, authenticated;
GRANT ALL ON public.video_chapters TO service_role;
ALTER TABLE public.video_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read chapters" ON public.video_chapters FOR SELECT USING (true);

CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id uuid,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_visitor ON public.chat_messages(visitor_id, created_at);
GRANT SELECT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.blocked_visitors (
  visitor_id uuid PRIMARY KEY,
  blocked_at timestamptz NOT NULL DEFAULT now(),
  reason text
);
GRANT SELECT ON public.blocked_visitors TO anon, authenticated;
GRANT ALL ON public.blocked_visitors TO service_role;
ALTER TABLE public.blocked_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read blocked" ON public.blocked_visitors FOR SELECT USING (true);

DO $$ BEGIN
  ALTER TABLE public.folders ADD CONSTRAINT folders_drive_folder_id_key UNIQUE (drive_folder_id);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.visitors ADD CONSTRAINT visitors_visitor_key_key UNIQUE (visitor_key);
EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; END $$;

ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS chapters_generated boolean DEFAULT false;
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS duration_seconds numeric;
