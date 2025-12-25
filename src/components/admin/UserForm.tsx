'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking, useAuth, setDocumentNonBlocking } from '@/firebase';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { UserProfile } from '@/app/(app)/profile/page';

const addUserSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters.'),
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
  role: z.enum(['admin', 'user']),
});

const editUserSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters.'),
  role: z.enum(['admin', 'user']),
});

interface UserFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userToEdit?: UserProfile;
}

export function UserForm({ isOpen, setIsOpen, userToEdit }: UserFormProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  
  const isEditing = !!userToEdit;
  
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(isEditing ? editUserSchema : addUserSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        reset({
          fullName: userToEdit.fullName,
          role: userToEdit.role,
        });
      } else {
        reset({
          fullName: '',
          email: '',
          password: '',
          role: 'user',
        });
      }
    }
  }, [userToEdit, reset, isOpen, isEditing]);

  const onSubmit: SubmitHandler<any> = async (data) => {
    if (isEditing && userToEdit) {
      // Update logic
       if (!firestore) return;
        const userDocRef = doc(firestore, 'users', userToEdit.id);
        updateDocumentNonBlocking(userDocRef, {
            fullName: data.fullName,
            role: data.role,
        });

        // It is not possible to update a user's display name in Auth from a client-side admin action
        // without having them re-authenticate. We will only update Firestore here.

        toast({
            title: 'User Updated',
            description: `${data.fullName}'s details have been updated.`,
        });

    } else {
      // Add logic
      if (!auth || !firestore) return;
      try {
        // We need a temporary auth instance to create a user without signing out the admin
        const tempApp = auth.app;
        const tempAuth = auth;

        const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: data.fullName });

        const userProfileRef = doc(firestore, 'users', user.uid);
        setDocumentNonBlocking(userProfileRef, {
            id: user.uid,
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            status: 'active',
            createdAt: serverTimestamp(),
        }, { merge: true });

        toast({
            title: 'User Created',
            description: `An account for ${data.fullName} has been created.`,
        });

      } catch (error: any) {
        let description = "An unexpected error occurred.";
        if (error.code === 'auth/email-already-in-use') {
            description = "This email is already registered.";
        }
         toast({
            variant: 'destructive',
            title: 'Creation Failed',
            description,
        });
      }
    }
    setIsOpen(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
            <DialogDescription>
              {isEditing ? `Update details for ${userToEdit.fullName}.` : 'Create a new user account and profile.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-sm text-destructive">{(errors.fullName as any).message}</p>}
            </div>
            
            {!isEditing && (
              <>
                 <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register('email')} />
                  {errors.email && <p className="text-sm text-destructive">{(errors.email as any).message}</p>}
                </div>
                 <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" {...register('password')} />
                  {errors.password && <p className="text-sm text-destructive">{(errors.password as any).message}</p>}
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select
                  onValueChange={(value) => setValue('role', value as 'admin' | 'user')}
                  defaultValue={userToEdit?.role || 'user'}
                  disabled={userToEdit?.email === 'abbas@example.com'}
              >
                  <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-destructive">{(errors.role as any).message}</p>}
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Save Changes' : 'Create User'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
