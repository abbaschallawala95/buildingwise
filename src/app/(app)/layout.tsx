'use client';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { useDoc, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { doc } from 'firebase/firestore';
import type { UserProfile } from './profile/page';
import { useToast } from '@/hooks/use-toast';
import React from 'react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();
  const { toast } = useToast();

  const currentUserProfileDoc = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: currentUserProfile, isLoading: isLoadingCurrentUser } = useDoc<UserProfile>(currentUserProfileDoc);
  const isUserAdmin = currentUserProfile?.role === 'admin';

  useEffect(() => {
    // 1. Handle user authentication loading and unauthenticated state
    if (!isUserLoading && !user) {
      router.push('/login');
      return; // Stop further checks if user is not logged in
    }

    // 2. Handle admin page authorization after profile is loaded
    if (pathname === '/admin' && !isLoadingCurrentUser && currentUserProfile) {
      if (currentUserProfile.role !== 'admin') {
        toast({
          variant: 'destructive',
          title: 'Unauthorized',
          description: 'You do not have permission to access the admin page.',
        });
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router, pathname, currentUserProfile, isLoadingCurrentUser, toast]);


  // Show loading spinner while auth is resolving or if navigating to admin and profile is loading
  if (isUserLoading || !user || isLoadingCurrentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Final check: If trying to access admin but profile hasn't loaded or user is not admin, show loading/auth screen.
  // This prevents the admin page from rendering with incorrect permissions.
  if (pathname === '/admin' && (!currentUserProfile || currentUserProfile.role !== 'admin')) {
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-2">Verifying authorization...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[280px_1fr]">
      <AppSidebar isUserAdmin={isUserAdmin} />
      <div className="flex flex-col">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {React.Children.map(children, child => {
              if (React.isValidElement(child)) {
                // @ts-ignore
                return React.cloneElement(child, { isUserAdmin });
              }
              return child;
            })}
        </main>
      </div>
    </div>
  );
}
