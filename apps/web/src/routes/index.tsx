import { Button } from "@profile-fill-assistant/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@profile-fill-assistant/ui/components/card";
import { Input } from "@profile-fill-assistant/ui/components/input";
import { Label } from "@profile-fill-assistant/ui/components/label";
import { createFileRoute } from "@tanstack/react-router";
import { Database, HardDriveDownload, LaptopMinimal, Save } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  type AppState,
  type ProfileDraft,
  emptyProfileDraft,
  isSameProfileDraft,
  loadAppState,
  persistProfile,
} from "@/lib/profile";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function formatUpdatedAt(value: string) {
  if (!value) {
    return "Never saved";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function HomeComponent() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [draft, setDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [savedDraft, setSavedDraft] = useState<ProfileDraft>(emptyProfileDraft);
  const [updatedAt, setUpdatedAt] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const state = await loadAppState();

        if (cancelled) {
          return;
        }

        setAppState(state);
        setDraft(state.profile);
        setSavedDraft(state.profile);
        setUpdatedAt(state.profile.updatedAt);
        setErrorMessage("");
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : "Failed to load local profile data.";
        setErrorMessage(message);
        toast.error(message);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasUnsavedChanges = useMemo(() => {
    return !isSameProfileDraft(draft, savedDraft);
  }, [draft, savedDraft]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const saved = await persistProfile(draft);

      setDraft(saved);
      setSavedDraft(saved);
      setUpdatedAt(saved.updatedAt);
      setAppState((currentState) => {
        if (!currentState) {
          return null;
        }

        return {
          ...currentState,
          profile: saved,
        };
      });

      toast.success(
        appState?.isTauri ? "Saved to local SQLite." : "Saved to browser storage for web preview.",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleFieldChange<K extends keyof ProfileDraft>(field: K, value: ProfileDraft[K]) {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6">
      <section className="grid gap-4 border-b border-border/70 pb-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="space-y-4">
          <span className="inline-flex w-fit items-center gap-2 border border-border bg-background px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            <LaptopMinimal className="size-3.5" />
            Tauri Desktop
          </span>
          <div className="space-y-3">
            <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
              本地优先的个人资料编辑器
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              现在前端运行在 Tauri 桌面壳里，资料直接写入本机 SQLite，不再依赖 Cloudflare
              Workers、D1 或远端 API。
            </p>
          </div>
        </div>

        <Card className="border border-border/70 bg-muted/20 py-0">
          <CardHeader className="border-b border-border/70 py-4">
            <CardTitle>Runtime</CardTitle>
            <CardDescription>当前数据读写路径和运行环境。</CardDescription>
            <CardAction>
              <span className="border border-border px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {appState?.isTauri ? "SQLite" : "Preview"}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Storage</p>
                <p className="break-all text-sm">
                  {isLoading
                    ? "Resolving local database path..."
                    : appState?.storagePath ?? "Unavailable"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <HardDriveDownload className="mt-0.5 size-4 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                <p className="text-sm">
                  {errorMessage
                    ? errorMessage
                    : isLoading
                      ? "Loading local profile state..."
                      : appState?.isTauri
                        ? "Desktop runtime connected to local SQLite."
                        : "Browser preview fallback is active."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid flex-1 gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border border-border/70 py-0">
          <CardHeader className="border-b border-border/70 py-4">
            <CardTitle>Profile Draft</CardTitle>
            <CardDescription>编辑后点击保存，内容会直接落到本机数据库。</CardDescription>
            <CardAction>
              <span className="border border-border px-2 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                {hasUnsavedChanges ? "Unsaved" : "Synced"}
              </span>
            </CardAction>
          </CardHeader>
          <CardContent className="py-4">
            <form className="grid gap-4" onSubmit={handleSubmit}>
              <div className="grid gap-2">
                <Label htmlFor="full-name">Full Name</Label>
                <Input
                  id="full-name"
                  value={draft.fullName}
                  onChange={(event) => handleFieldChange("fullName", event.target.value)}
                  placeholder="Ada Lovelace"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="headline">Headline</Label>
                <Input
                  id="headline"
                  value={draft.headline}
                  onChange={(event) => handleFieldChange("headline", event.target.value)}
                  placeholder="Product-minded engineer building local-first tooling"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={draft.location}
                  onChange={(event) => handleFieldChange("location", event.target.value)}
                  placeholder="Shanghai / Remote"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="summary">Summary</Label>
                <textarea
                  id="summary"
                  className="min-h-40 w-full resize-y border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
                  value={draft.summary}
                  onChange={(event) => handleFieldChange("summary", event.target.value)}
                  placeholder="Write a compact summary that can be reused in profiles, bios, and application forms."
                />
              </div>

              <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                <p className="text-xs text-muted-foreground">Last saved: {formatUpdatedAt(updatedAt)}</p>
                <Button type="submit" disabled={isLoading || isSaving}>
                  <Save className="size-4" />
                  {isSaving ? "Saving..." : "Save Locally"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-muted/10 py-0">
          <CardHeader className="border-b border-border/70 py-4">
            <CardTitle>Desktop Notes</CardTitle>
            <CardDescription>这次改造后的运行方式。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 py-4 text-sm text-muted-foreground">
            <p>开发模式下用 `pnpm dev` 启动 Tauri 桌面窗口，前端仍然由 Vite 提供热更新。</p>
            <p>构建时用 `pnpm build`，Tauri 会先执行前端构建，再打包桌面应用二进制。</p>
            <p>如果只想调前端，可以继续用 `pnpm dev:web`，这时页面会退回浏览器本地存储预览模式。</p>
            <p>SQLite 数据库文件位于应用数据目录下，默认文件名是 `profile-fill-assistant.sqlite3`。</p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
