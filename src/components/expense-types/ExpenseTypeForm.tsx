'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, doc, serverTimestamp } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

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

import type { ExpenseType } from '@/app/(app)/expense-types/page';

const expenseTypeSchema = z.object({
  name: z.string().min(3, 'Category name must be at least 3 characters long.'),
});

type ExpenseTypeFormValues = z.infer<typeof expenseTypeSchema>;

interface ExpenseTypeFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  expenseType?: ExpenseType;
}

export function ExpenseTypeForm({ isOpen, setIsOpen, expenseType }: ExpenseTypeFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseTypeFormValues>({
    resolver: zodResolver(expenseTypeSchema),
  });

  useEffect(() => {
    if (isOpen) {
      if (expenseType) {
        reset({ name: expenseType.name });
      } else {
        reset({ name: '' });
      }
    }
  }, [expenseType, reset, isOpen]);

  const onSubmit: SubmitHandler<ExpenseTypeFormValues> = async (data) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    try {
      if (expenseType) {
        // Update existing
        const docRef = doc(firestore, 'expenseTypes', expenseType.id);
        updateDocumentNonBlocking(docRef, data);
        toast({
          title: 'Success',
          description: 'Expense type updated successfully.',
        });
      } else {
        // Add new
        const collectionRef = collection(firestore, 'expenseTypes');
        addDocumentNonBlocking(collectionRef, {
          ...data,
          createdAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Expense type added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save expense type.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{expenseType ? 'Edit Expense Type' : 'Add New Expense Type'}</DialogTitle>
            <DialogDescription>
              {expenseType ? 'Update the name of the category.' : 'Create a new category for expenses.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input id="name" {...register('name')} placeholder="e.g. Lift Maintenance" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {expenseType ? 'Save Changes' : 'Add Type'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
