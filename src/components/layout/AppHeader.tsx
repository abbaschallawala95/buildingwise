'use client';
import Link from 'next/link';
import {
  Menu,
  Search,
  Building2,
  Users,
  Wrench,
  PlusCircle,
  CreditCard,
  LayoutDashboard,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '../icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/buildings", label: "Buildings", icon: Building2 },
    { href: "/members", label: "Members", icon: Users },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
    { href: "/extra-collections", label: "Extra Collections", icon: PlusCircle },
    { href: "/expenses", label: "Expenses", icon: CreditCard },
    { href: "/expense-types", label: "Expense Types", icon: Settings },
];

function HeaderContent() {
    const pathname = usePathname();
  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <SheetHeader className="text-left">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Main navigation links for the application.
            </SheetDescription>
          </SheetHeader>
           <nav className="grid gap-2 text-lg font-medium">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Logo />
            </Link>
            {navLinks.map(link => {
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                         className={cn(
                            "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2",
                            isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                    </Link>
                )
            })}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="w-full flex-1">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
    </>
  );
}


export function AppHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      {mounted ? <HeaderContent /> : null}
    </header>
  );
}
