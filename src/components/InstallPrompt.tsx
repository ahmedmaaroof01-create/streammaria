import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = typeof window !== "undefined" && sessionStorage.getItem("install_dismissed");
    if (dismissed) return;
    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible || !evt) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-sm -translate-x-1/2 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 text-sm">
          <div className="font-semibold">ثبّت ماريا على هاتفك</div>
          <div className="text-xs text-muted-foreground">تجربة كاملة بدون متصفح</div>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            await evt.prompt();
            await evt.userChoice;
            setVisible(false);
          }}
        >
          تثبيت
        </Button>
        <button
          aria-label="إغلاق"
          onClick={() => {
            sessionStorage.setItem("install_dismissed", "1");
            setVisible(false);
          }}
          className="rounded p-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
