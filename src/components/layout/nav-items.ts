import {
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/", icon: LayoutDashboard },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Devices", href: "/devices", icon: Smartphone },
  { label: "API Keys", href: "/keys", icon: KeyRound },
];
