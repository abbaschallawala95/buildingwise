'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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
import { useAuth, useFirestore, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
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
  const password = 'abbas2026';
  const fullName = 'Abbas';

  try {
    // 1. Try to sign in first to see if the user exists in Auth.
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. If sign-in is successful, check the Firestore document.
    const userDocRef = doc(firestore, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || userDoc.data()?.status !== 'active' || userDoc.data()?.role !== 'admin') {
      // 2a. If the document is missing or incorrect, fix it.
      await setDocumentNonBlocking(userDocRef, {
        id: user.uid,
        fullName: user.displayName || fullName,
        email: user.email,
        role: 'admin',
        status: 'active',
        createdAt: userDoc.exists() ? userDoc.data()?.createdAt : serverTimestamp(),
      }, { merge: true });
      console.log('Initial admin user profile was corrected in Firestore.');
    }
    // 3. Sign out the temporary session so the user can log in themselves.
    await auth.signOut();

  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      // 4. If the user doesn't exist, create them.
      try {
        const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = newUserCredential.user;
        await updateProfile(newUser, { displayName: fullName });
        const userProfileRef = doc(firestore, 'users', newUser.uid);
        await setDocumentNonBlocking(userProfileRef, {
          id: newUser.uid,
          fullName: fullName,
          email: email,
          role: 'admin',
          status: 'active',
          createdAt: serverTimestamp(),
        }, { merge: true });
        console.log('Initial admin user created successfully.');
        // Sign out immediately so the user can log in.
        await auth.signOut();
      } catch (creationError) {
        console.error("Failed to create initial admin user:", creationError);
      }
    } else if (error.code !== 'auth/email-already-in-use') {
      // Log other unexpected errors during the check.
      console.error("An unexpected error occurred during initial user verification:", error);
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
      setIsInitializing(false);
    }
  }, [auth, firestore]);


  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    if (!auth || !firestore) return;
    try {
      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

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
       <div className="flex items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
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
