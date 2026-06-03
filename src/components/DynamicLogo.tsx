import { useMemo } from "react";
import { Film, GraduationCap, Music, Trophy, Sparkles, PlayCircle } from "lucide-react";

const CONFIG: Record<
  string,
  { label: string; Icon: typeof Film; color: string }
> = {
  movies: { label: "أفلام", Icon: Film, color: "oklch(0.55 0.22 25)" },
  education: { label: "تعليمي", Icon: GraduationCap, color: "oklch(0.55 0.18 220)" },
  music: { label: "موسيقى", Icon: Music, color: "oklch(0.6 0.2 320)" },
  sports: { label: "رياضة", Icon: Trophy, color: "oklch(0.6 0.18 140)" },
  anime: { label: "أنمي", Icon: Sparkles, color: "oklch(0.6 0.2 50)" },
  general: { label: "مشغّل", Icon: PlayCircle, color: "oklch(0.55 0.18 265)" },
};

export function DynamicLogo({ contentType }: { contentType?: string | null }) {
  const cfg = useMemo(
    () => CONFIG[contentType ?? "general"] ?? CONFIG.general,
    [contentType],
  );
  const { Icon } = cfg;
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
        style={{ background: `linear-gradient(135deg, ${cfg.color}, oklch(0.7 0.15 280))` }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-base font-bold">مكتبتي</span>
        <span className="text-xs text-muted-foreground">{cfg.label}</span>
      </div>
    </div>
  );
}
