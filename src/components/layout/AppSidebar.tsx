'use client';

import Link from 'next/link';
import {
  Bell,
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
  UserCircle,
  History,
  ShieldCheck,
} from 'lucide-react';
import { collection, collectionGroup, doc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '../icons';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCollection, useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Member } from '@/app/(app)/members/page';
import type { UserProfile } from '@/app/(app)/profile/page';


const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/buildings', label: 'Buildings', icon: Building2 },
  { href: '/members', label: 'Members', icon: Users, collection: 'members' },
  { href: '/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
  { href: '/extra-collections', label: 'Extra Collections', icon: PlusCircle },
  { href: '/expenses', label: 'Expenses', icon: CreditCard },
  { href: '/dues', label: 'Dues', icon: ListX },
  { href: '/reports', label: 'Reports', icon: BookText },
  { href: '/logs', label: 'Logs', icon: History },
  { href: '/admin', label: 'Admin', icon: ShieldCheck, adminOnly: true },
  { href: '/expense-types', label: 'Expense Types', icon: Settings },
  { href: '/due-types', label: 'Due Types', icon: Tags },
];

const secondaryNavLinks = [
    { href: '/profile', label: 'Profile', icon: UserCircle },
    { href: '/settings', label: 'Settings', icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname();
  const firestore = useFirestore();
  const { user } = useUser();

  const membersCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'members') : null),
    [firestore]
  );
  
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersCollectionGroup);
  
  const memberCount = members?.length || 0;

  const userProfileDoc = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile } = useDoc<UserProfile>(userProfileDoc);

  return (
    <div className="hidden border-r bg-card lg:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Logo />
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navLinks.map((link) => {
              if (link.adminOnly && userProfile?.role !== 'admin') {
                return null;
              }
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                    isActive ? 'bg-muted text-primary' : 'text-muted-foreground'
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.collection === 'members' && !isLoadingMembers && memberCount > 0 && (
                    <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                      {memberCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
         <div className="mt-auto p-4">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                <Link
                  href="/profile"
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                    pathname === '/profile' ? 'bg-muted text-primary' : 'text-muted-foreground'
                  )}
                >
                  <UserCircle className="h-4 w-4" />
                  Profile
                </Link>
            </nav>
        </div>
      </div>
    </div>
  );
}
