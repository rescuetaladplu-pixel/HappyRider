import { Link, useLocation } from "@tanstack/react-router";
import { History, Wallet, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";
import runnerIcon from "@/assets/happyrider-runner.png";

type Item = {
  to: "/history" | "/earnings" | "/notifications" | "/profile";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const left: Item[] = [
  { to: "/history", label: "ประวัติ", icon: History },
  { to: "/earnings", label: "รายได้", icon: Wallet },
];
const right: Item[] = [
  { to: "/notifications", label: "แจ้งเตือน", icon: Bell },
  { to: "/profile", label: "โปรไฟล์", icon: User },
];

function NavItem({ item, active }: { item: Item; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
      <span className={cn(active && "font-semibold")}>{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;
  const isHome = path === "/";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_10px_rgba(0,0,0,0.04)]"
      aria-label="เมนูหลัก"
    >
      <div className="mx-auto flex max-w-3xl items-end">
        {left.map((it) => (
          <NavItem key={it.to} item={it} active={path === it.to} />
        ))}

        {/* Center home button (runner) */}
        <div className="flex flex-1 items-start justify-center">
          <Link
            to="/"
            aria-label="หน้าแรก พร้อมรับงาน"
            className={cn(
              "-mt-4 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-background bg-white shadow-md transition-transform active:scale-95",
              isHome && "ring-2 ring-primary/40",
            )}
          >
            <img
              src={runnerIcon}
              alt=""
              className="h-9 w-9 object-contain"
            />
          </Link>
        </div>

        {right.map((it) => (
          <NavItem key={it.to} item={it} active={path === it.to} />
        ))}
      </div>
      {isHome && (
        <div className="pb-0.5 text-center text-[10px] font-medium text-primary">
          หน้าแรก
        </div>
      )}
    </nav>
  );
}
