import { Loader2 } from "lucide-react";

export default function Loader() {
  return (
    <div className="flex h-full items-center justify-center gap-3 pt-8 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
      <span>Loading desktop workspace…</span>
    </div>
  );
}
