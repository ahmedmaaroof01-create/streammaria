import { useEffect, useRef, useState } from "react";
import { Camera, Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type Props = {
  src: string;
  mimeType?: string | null;
  poster?: string | null;
  onProgress?: (info: { position: number; watched: number; duration: number; completed: boolean }) => void;
  onSnapshot?: (dataUrl: string, position: number) => void;
};

const UNSUPPORTED_RE = /matroska|x-msvideo|x-ms-wmv|x-flv|3gpp/i;

export function VideoPlayer({ src, mimeType, poster, onProgress, onSnapshot }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Attach proper streaming engine
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    setError(null);

    let cleanup: (() => void) | undefined;

    const lower = src.toLowerCase();
    const isHls = lower.includes(".m3u8") || mimeType === "application/vnd.apple.mpegurl";
    const isDash = lower.includes(".mpd") || mimeType === "application/dash+xml";

    if (isHls) {
      import("hls.js").then(({ default: Hls }) => {
        if (Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(src);
          hls.attachMedia(video);
          cleanup = () => hls.destroy();
        } else {
          video.src = src;
        }
      });
    } else if (isDash) {
      import("dashjs").then((dash) => {
        const player = dash.MediaPlayer().create();
        player.initialize(video, src, false);
        cleanup = () => player.destroy();
      });
    } else {
      video.src = src;
    }

    return () => cleanup?.();
  }, [src, mimeType]);

  // Track watched seconds
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      const now = v.currentTime;
      if (lastTickRef.current != null && !v.paused) {
        const delta = now - lastTickRef.current;
        if (delta > 0 && delta < 2) watchedRef.current += delta;
      }
      lastTickRef.current = now;
      setPosition(now);
      onProgress?.({
        position: now,
        watched: watchedRef.current,
        duration: v.duration || 0,
        completed: v.duration > 0 && now / v.duration > 0.9,
      });
    };
    const onLoaded = () => setDuration(v.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      if (UNSUPPORTED_RE.test(mimeType ?? "")) {
        setError("هذه الصيغة غير مدعومة في المتصفح. يمكنك تنزيل الملف لتشغيله محلياً.");
      } else {
        setError("تعذر تشغيل الفيديو. تحقق من الرابط أو حاول مجدداً.");
      }
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onError);
    };
  }, [mimeType, onProgress]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  };
  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };
  const seek = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
  };
  const setRate = (r: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = r;
    setSpeed(r);
  };
  const fullscreen = () => {
    const v = videoRef.current;
    v?.requestFullscreen?.();
  };
  const snapshot = () => {
    const v = videoRef.current;
    if (!v) return;
    const canvas = document.createElement("canvas");
    canvas.width = v.videoWidth || 640;
    canvas.height = v.videoHeight || 360;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    try {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.7);
      onSnapshot?.(data, v.currentTime);
    } catch {
      // CORS may block this for Drive streams — fall back to noop
      onSnapshot?.("", v.currentTime);
    }
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full overflow-hidden rounded-xl border bg-black">
      <div className="relative aspect-video w-full">
        <video
          ref={videoRef}
          poster={poster ?? undefined}
          className="absolute inset-0 h-full w-full"
          playsInline
          controls={false}
          crossOrigin="anonymous"
        />
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-4 text-center text-white">
            <p className="mb-3 text-sm">{error}</p>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              تنزيل الملف
            </a>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 bg-card p-3 text-card-foreground">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={togglePlay}>
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {fmt(position)} / {fmt(duration)}
          </span>
          <div className="flex-1 px-2">
            <Slider
              value={[position]}
              max={Math.max(duration, 1)}
              step={0.1}
              onValueChange={(v) => seek(v[0])}
            />
          </div>
          <Button size="icon" variant="ghost" onClick={toggleMute}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <select
            value={speed}
            onChange={(e) => setRate(Number(e.target.value))}
            className="rounded border bg-background px-1 py-0.5 text-xs"
          >
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map((r) => (
              <option key={r} value={r}>
                {r}x
              </option>
            ))}
          </select>
          <Button size="icon" variant="ghost" onClick={snapshot} title="التقاط لقطة">
            <Camera className="h-5 w-5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={fullscreen}>
            <Maximize className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
