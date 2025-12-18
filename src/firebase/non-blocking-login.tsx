'use client';
import {
  Auth, // Import Auth type for type hinting
  signInAnonymously,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { toast } from '@/hooks/use-toast';

/** Initiate anonymous sign-in (non-blocking). */
export function initiateAnonymousSignIn(authInstance: Auth): void {
  signInAnonymously(authInstance).catch((error) => {
    toast({
      variant: 'destructive',
      title: 'Anonymous Sign-In Failed',
      description: error.message || 'An unexpected error occurred.',
    });
  });
}

/** Initiate email/password sign-up (non-blocking). */
export function initiateEmailSignUp(authInstance: Auth, email: string, password: string): void {
  createUserWithEmailAndPassword(authInstance, email, password)
  .then(() => {
      toast({
        title: "Sign Up Successful",
        description: "Your account has been created. Please log in.",
      });
  })
  .catch((error) => {
    toast({
      variant: 'destructive',
      title: 'Sign Up Failed',
      description: error.message || 'An unexpected error occurred.',
    });
  });
}

/** Initiate email/password sign-in (non-blocking). */
export function initiateEmailSignIn(authInstance: Auth, email: string, password: string): void {
  signInWithEmailAndPassword(authInstance, email, password).catch((error) => {
    toast({
      variant: 'destructive',
      title: 'Login Failed',
      description: error.message || 'An unexpected error occurred.',
    });
  });
}
