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

  useEffect(() => {
    // 1. Handle user authentication loading and unauthenticated state
    if (!isUserLoading && !user) {
      router.push('/login');
      return;
    }

    // 2. Handle admin page authorization
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


  if (isUserLoading || !user || (pathname === '/admin' && isLoadingCurrentUser)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-[280px_1fr]">
      <AppSidebar />
      <div className="flex flex-col">
        <AppHeader />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}
