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
  ListX,
  Tags,
  BookText,
  UserCircle2,
  LogOut,
  History,
  ShieldCheck,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Logo } from '../icons';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserProfile } from '@/app/(app)/profile/page';
import { doc } from 'firebase/firestore';

const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/buildings", label: "Buildings", icon: Building2 },
    { href: "/members", label: "Members", icon: Users },
    { href: "/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/transactions", label: "Transactions", icon: ArrowRightLeft },
    { href: "/extra-collections", label: "Extra Collections", icon: PlusCircle },
    { href: "/expenses", label: "Expenses", icon: CreditCard },
    { href: "/dues", label: "Dues", icon: ListX },
    { href: "/reports", label: "Reports", icon: BookText },
    { href: "/logs", label: "Logs", icon: History },
    { href: "/admin", label: "Admin", icon: ShieldCheck, adminOnly: true },
    { href: "/settings", label: "Settings" , icon: Settings, subMenu: [
      { href: "/expense-types", label: "Expense Types", icon: Settings },
      { href: "/due-types", label: "Due Types", icon: Tags },
    ]},
];

function HeaderContent() {
    const pathname = usePathname();
    const auth = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const firestore = useFirestore();

    const userProfileDoc = useMemoFirebase(
      () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
      [firestore, user]
    );
    const { data: userProfile } = useDoc<UserProfile>(userProfileDoc);

    const handleSignOut = async () => {
      if (auth) {
        await signOut(auth);
      }
      router.push('/login');
    };
    
    const getInitials = (name: string) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('');
    }

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
                if (link.adminOnly && userProfile?.role !== 'admin') {
                    return null;
                }
                 if (link.subMenu) {
                  return null; // Don't render top-level settings in mobile nav
                }
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
             {/* Manually add settings sub-menu for mobile */}
            <Link
                href="/expense-types"
                className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2",
                    pathname === '/expense-types' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Settings className="h-5 w-5" />
                Expense Types
            </Link>
            <Link
                href="/due-types"
                className={cn(
                    "mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2",
                    pathname === '/due-types' ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
            >
                <Tags className="h-5 w-5" />
                Due Types
            </Link>
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <Avatar>
                {user?.photoURL ? (
                    <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                ) : (
                    <AvatarFallback>{getInitials(user?.displayName || '')}</AvatarFallback>
                )}
            </Avatar>
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile">
                <UserCircle2 className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}


export function AppHeader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6" />;
  }

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6">
      <HeaderContent />
    </header>
  );
}
