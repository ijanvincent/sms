"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  // Lock body scroll and allow Escape to close while the drawer is open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-sidebar px-4 md:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="-mr-2 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
        >
          <Menu className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 max-w-[80%] flex-col border-r bg-sidebar">
            <div className="flex h-14 items-center justify-between border-b px-5">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close navigation"
                className="-mr-2 flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
