import { useEffect } from "react";

const BAD = /(mx-auto|container|max-w-|max-w\[[^\]]+\]|SidebarInset)/;

export function LayoutDoctor({ rootSelector = "#interactions-root" }: { rootSelector?: string }) {
  if (process.env.NODE_ENV === "production") return null as any;
  useEffect(() => {
    const root = document.querySelector(rootSelector) ?? document.body;
    const offenders: Element[] = [];

    // Match obvious class-based clamps
    root.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const cls = (el.className?.toString() ?? "");
      if (BAD.test(cls)) offenders.push(el);
    });

    // Detect *computed* clamps (centered + narrow vs viewport)
    const vw = document.documentElement.clientWidth;
    root.querySelectorAll<HTMLElement>("*").forEach((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      const centered = cs.marginLeft === "auto" && cs.marginRight === "auto";
      const looksClamped = r.width > 0 && centered && vw - r.width > 320;
      if (looksClamped && !offenders.includes(el)) offenders.push(el);
    });

    if (offenders.length) {
      console.warn("[LayoutDoctor] Offending nodes (outlined in red):");
      offenders.forEach((el) => {
        (el as HTMLElement).style.outline = "1px solid red";
        console.warn(el.className, el);
      });
    } else {
      console.info("[LayoutDoctor] No obvious clamps found.");
    }
  }, []);
  return null;
}