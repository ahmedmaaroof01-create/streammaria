-- Grant access to new tables for the server (admin client) and read policies
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
GRANT SELECT ON public.chat_messages TO anon;

GRANT ALL ON public.video_chapters TO service_role;
GRANT SELECT ON public.video_chapters TO anon;
GRANT SELECT ON public.video_chapters TO authenticated;

GRANT ALL ON public.blocked_visitors TO service_role;
GRANT SELECT ON public.blocked_visitors TO anon;
GRANT SELECT ON public.blocked_visitors TO authenticated;

-- ensure visitor tracking grants
GRANT ALL ON public.visitors TO service_role;
GRANT ALL ON public.watch_sessions TO service_role;
GRANT ALL ON public.interactions TO service_role;
GRANT ALL ON public.snapshots TO service_role;
GRANT ALL ON public.videos TO service_role;
GRANT ALL ON public.folders TO service_role;

-- enable RLS on chat_messages if not already
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- allow public read on chat_messages (admin can query own visitor history; visitor sees own messages)
DROP POLICY IF EXISTS "public read chat" ON public.chat_messages;
CREATE POLICY "public read chat" ON public.chat_messages FOR SELECT USING (true);
