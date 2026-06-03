
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drive_folder_id TEXT NOT NULL UNIQUE,
  drive_url TEXT NOT NULL,
  content_type TEXT DEFAULT 'general',
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mime_type TEXT,
  size BIGINT,
  thumbnail_url TEXT,
  duration NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_videos_folder ON public.videos(folder_id);

CREATE TABLE public.visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_key TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_interactions_video ON public.interactions(video_id);
CREATE INDEX idx_interactions_visitor ON public.interactions(visitor_id);

CREATE TABLE public.watch_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  watched_seconds NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  last_position NUMERIC DEFAULT 0
);
CREATE INDEX idx_sessions_video ON public.watch_sessions(video_id);

CREATE TABLE public.snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  position_seconds NUMERIC NOT NULL,
  image_data TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_snapshots_video ON public.snapshots(video_id);

GRANT SELECT ON public.folders TO anon, authenticated;
GRANT ALL ON public.folders TO service_role;
GRANT SELECT ON public.videos TO anon, authenticated;
GRANT ALL ON public.videos TO service_role;
GRANT SELECT ON public.visitors TO anon, authenticated;
GRANT ALL ON public.visitors TO service_role;
GRANT SELECT ON public.interactions TO anon, authenticated;
GRANT ALL ON public.interactions TO service_role;
GRANT SELECT ON public.watch_sessions TO anon, authenticated;
GRANT ALL ON public.watch_sessions TO service_role;
GRANT SELECT ON public.snapshots TO anon, authenticated;
GRANT ALL ON public.snapshots TO service_role;

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read folders" ON public.folders FOR SELECT USING (true);
CREATE POLICY "public read videos" ON public.videos FOR SELECT USING (true);
CREATE POLICY "public read visitors" ON public.visitors FOR SELECT USING (true);
CREATE POLICY "public read interactions" ON public.interactions FOR SELECT USING (true);
CREATE POLICY "public read sessions" ON public.watch_sessions FOR SELECT USING (true);
CREATE POLICY "public read snapshots" ON public.snapshots FOR SELECT USING (true);
