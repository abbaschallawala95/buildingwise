import Link from 'next/link';
import {
  Bell,
  Building2,
  Users,
  Wrench,
  PlusCircle,
  CreditCard,
  LayoutDashboard,
  ArrowRightLeft
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '../icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';


const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/buildings", label: "Buildings", icon: Building2 },
    { href: "/members", label: "Members", icon: Users, badge: true },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
    { href: "/extra-collections", label: "Extra Collections", icon: PlusCircle },
    { href: "/expenses", label: "Expenses", icon: CreditCard },
];

export function AppSidebar() {
    const pathname = usePathname();

  return (
    <div className="hidden border-r bg-card lg:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Logo />
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navLinks.map(link => {
                 const isActive = pathname === link.href;
                 return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                            isActive ? "bg-muted text-primary" : "text-muted-foreground"
                        )}
                    >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                        {link.badge && (
                            <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                                6
                            </Badge>
                        )}
                    </Link>
                )
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
