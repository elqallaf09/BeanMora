import type { LucideIcon } from "lucide-react";
import { Home, Compass, Coffee, Users, User } from "lucide-react";

export interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
}

/** Primary navigation: bottom nav on mobile, sidebar on desktop. */
export const primaryNavItems: NavItem[] = [
  { href: "/home", labelKey: "nav.home", icon: Home },
  { href: "/discover", labelKey: "nav.discover", icon: Compass },
  { href: "/brew", labelKey: "nav.brew", icon: Coffee },
  { href: "/community", labelKey: "nav.community", icon: Users },
  { href: "/profile", labelKey: "nav.profile", icon: User },
];
