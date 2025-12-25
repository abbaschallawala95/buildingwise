'use server';

/**
 * @fileOverview A secure flow for creating a new user.
 * This flow uses the Firebase Admin SDK to create a user without signing out the current admin.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps } from 'firebase-admin/app';

const CreateUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(3),
});
export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;

const CreateUserOutputSchema = z.object({
  uid: z.string(),
  email: z.string(),
  fullName: z.string(),
});
export type CreateUserOutput = z.infer<typeof CreateUserOutputSchema>;

// Initialize Firebase Admin SDK if not already initialized
function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    // Initialize with Application Default Credentials
    initializeApp();
  }
}

export async function createUser(input: CreateUserInput): Promise<CreateUserOutput> {
  return createUserFlow(input);
}

const createUserFlow = ai.defineFlow(
  {
    name: 'createUserFlow',
    inputSchema: CreateUserInputSchema,
    outputSchema: CreateUserOutputSchema,
  },
  async (input) => {
    initializeFirebaseAdmin();
    const auth = getAuth();
    const firestore = getFirestore();

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: input.email,
      password: input.password,
      displayName: input.fullName,
    });

    // Create user profile in Firestore
    const userProfileRef = firestore.collection('users').doc(userRecord.uid);
    await userProfileRef.set({
      id: userRecord.uid,
      fullName: input.fullName,
      email: input.email,
      role: 'user', // Default role
      status: 'active', // Default status
      createdAt: new Date(),
    });

    return {
      uid: userRecord.uid,
      email: userRecord.email!,
      fullName: userRecord.displayName!,
    };
  }
);
