import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-14 items-center border-b px-5">
        <Brand />
      </div>
      <NavLinks />
    </aside>
  );
}
