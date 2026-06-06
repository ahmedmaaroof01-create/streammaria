import { Play } from "lucide-react";

export function DynamicLogo({ contentType: _contentType }: { contentType?: string | null }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, oklch(0.45 0.25 305), oklch(0.6 0.28 350))" }}
      >
        <Play className="h-5 w-5 fill-current" />
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-bold tracking-tight">ماريا</span>
        <span className="text-[10px] text-muted-foreground">منصة الأفلام</span>
      </div>
    </div>
  );
}
