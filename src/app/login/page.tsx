'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  updateProfile
} from 'firebase/auth';
import { doc, serverTimestamp, getDoc } from 'firebase/firestore';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { useEffect, useState } from 'react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(1, { message: 'Password is required.' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

async function createOrVerifyInitialUser(auth: any, firestore: any) {
  const email = 'abbas@example.com';
  const password = 'abbas123';
  const fullName = 'Abbas';

  try {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    
    if (signInMethods.length > 0) {
      // User exists, ensure their profile is correct
      // This is a simplified way to get the UID for an existing email.
      // In a real-world scenario, you might need a more robust method if the user isn't logged in.
      // For this initial setup, we assume we can sign in to get the UID, or we have it from a previous creation step.
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userProfileRef = doc(firestore, 'users', user.uid);
        // Ensure role and status are correctly set for the admin
        setDocumentNonBlocking(userProfileRef, {
          role: 'admin',
          status: 'active',
        }, { merge: true });
        await auth.signOut(); // Sign out immediately after verification
      } catch (e) {
         // If sign-in fails, it might be due to wrong password, but we proceed.
         // The main purpose is to ensure the user document is correct if they exist.
         // We can find the user by email in a more complex app, but this will suffice for setup.
      }
    } else {
      // User does not exist, create them
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: fullName });

      const userProfileRef = doc(firestore, 'users', user.uid);
      setDocumentNonBlocking(userProfileRef, {
        id: user.uid,
        fullName: fullName,
        email: email,
        role: 'admin', // Super admin
        status: 'active', // Must be active
        createdAt: serverTimestamp(),
      }, { merge: true });
       await auth.signOut(); // Sign out immediately after creation
    }
  } catch (error: any) {
    if (error.code !== 'auth/email-already-in-use') {
      console.error("Failed to create or verify initial user:", error);
    }
  }
}

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (auth && firestore) {
      createOrVerifyInitialUser(auth, firestore).finally(() => setIsInitializing(false));
    } else if (!auth || !firestore) {
      // If firebase services aren't ready, don't just hang.
      setIsInitializing(false);
    }
  }, [auth, firestore]);


  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // Check user status in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists() || userDoc.data()?.status !== 'active') {
         await auth.signOut();
         toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Your account is inactive or does not exist.',
         });
         return;
      }

      toast({
        title: 'Login Successful',
        description: "Welcome back!",
      });
      router.push('/dashboard');
    } catch (error: any) {
      console.error('Login Error:', error);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please check your credentials.';
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description,
      });
    }
  };
  
  if (isInitializing) {
     return (
       <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Logo />
          </div>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                {...register('email')}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                {...register('password')}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="underline">
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
