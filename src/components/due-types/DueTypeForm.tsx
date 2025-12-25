'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useAuth } from '@/firebase';

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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

import type { DueType } from '@/app/(app)/due-types/page';
import { createLog } from '@/lib/logger';

const dueTypeSchema = z.object({
  name: z.string().min(3, 'Category name must be at least 3 characters long.'),
});

type DueTypeFormValues = z.infer<typeof dueTypeSchema>;

interface DueTypeFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  dueType?: DueType;
}

export function DueTypeForm({ isOpen, setIsOpen, dueType }: DueTypeFormProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DueTypeFormValues>({
    resolver: zodResolver(dueTypeSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (dueType) {
        reset({ name: dueType.name });
      } else {
        reset({ name: '' });
      }
    }
  }, [dueType, reset, isOpen]);

  const onSubmit: SubmitHandler<DueTypeFormValues> = async (data) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    try {
      if (dueType) {
        // Update existing
        const docRef = doc(firestore, 'dueTypes', dueType.id);
        updateDocumentNonBlocking(docRef, data);
        createLog(firestore, auth, {
            action: 'updated',
            entityType: 'Due Type',
            entityId: dueType.id,
            description: `Updated due type: ${data.name}`,
        });
        toast({
          title: 'Success',
          description: 'Due type updated successfully.',
        });
      } else {
        // Add new
        const collectionRef = collection(firestore, 'dueTypes');
        const newDoc = await addDocumentNonBlocking(collectionRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
        if (newDoc) {
            createLog(firestore, auth, {
                action: 'created',
                entityType: 'Due Type',
                entityId: newDoc.id,
                description: `Created new due type: ${data.name}`,
            });
        }
        toast({
          title: 'Success',
          description: 'Due type added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save due type.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{dueType ? 'Edit Due Type' : 'Add New Due Type'}</DialogTitle>
            <DialogDescription>
              {dueType ? 'Update the name of the category.' : 'Create a new category for dues.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Late Fee" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dueType ? 'Save Changes' : 'Add Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
