import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Lock, Loader2 } from "lucide-react";
import { adminLogin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — ماريا" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const login = useServerFn(adminLogin);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("admin_token")) {
      navigate({ to: "/admin/dashboard" });
    }
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await login({ data: { passcode: pass } });
      sessionStorage.setItem("admin_token", res.token);
      toast.success("تم تسجيل الدخول");
      navigate({ to: "/admin/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "رمز خاطئ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="mb-4 flex flex-col items-center gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
            style={{ background: "linear-gradient(135deg, oklch(0.45 0.25 305), oklch(0.6 0.28 350))" }}
          >
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-bold">لوحة الإدارة</h1>
          <p className="text-xs text-muted-foreground">أدخل رمز الإدارة</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            inputMode="numeric"
            placeholder="••••"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="text-center text-lg tracking-widest"
            autoFocus
          />
          <Button type="submit" className="w-full" disabled={busy || !pass}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "دخول"}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
            العودة للرئيسية
          </Link>
        </div>
      </Card>
    </div>
  );
}
