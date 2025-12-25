'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { doc } from 'firebase/firestore';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';

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
import { createUser } from '@/ai/flows/create-user-flow';

const userFormSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters.'),
  email: z.string().email('Please enter a valid email address.').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
  role: z.enum(['admin', 'user'], { required_error: 'Please select a role.' }),
}).refine(data => {
  // If email is present, password must be present (for new user creation)
  if (data.email) {
    return !!data.password;
  }
  return true;
}, {
  message: 'Password is required when creating a new user.',
  path: ['password'],
});

interface UserFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userToEdit?: UserProfile;
}

export function UserForm({ isOpen, setIsOpen, userToEdit }: UserFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const isEditing = !!userToEdit;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      role: 'user' as 'admin' | 'user',
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (isEditing && userToEdit) {
        reset({
          fullName: userToEdit.fullName,
          role: userToEdit.role,
          email: userToEdit.email, // Keep email for context, but it won't be edited
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

        toast({
            title: 'User Updated',
            description: `${data.fullName}'s details have been updated.`,
        });

    } else {
      // Add logic
      if (!data.email || !data.password) return;
      try {
        await createUser({
          email: data.email,
          password: data.password,
          fullName: data.fullName,
        });
        
        toast({
            title: 'User Created',
            description: `An account for ${data.fullName} has been created.`,
        });

      } catch (error: any) {
        let description = "An unexpected error occurred.";
        if (error.message?.includes('auth/email-already-exists')) {
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
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
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
                )}
              />
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
