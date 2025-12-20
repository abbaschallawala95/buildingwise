'use client';

import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
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

export type ExpenseType = {
  id: string;
  name: string;
};

const expenseTypeSchema = z.object({
  name: z.string().min(3, 'Type name must be at least 3 characters long.'),
});

type ExpenseTypeFormValues = z.infer<typeof expenseTypeSchema>;

interface AddExpenseTypeDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export function AddExpenseTypeDialog({ isOpen, setIsOpen }: AddExpenseTypeDialogProps) {
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
      const collectionRef = collection(firestore, 'expenseTypes');
      addDocumentNonBlocking(collectionRef, {
          ...data,
          createdAt: serverTimestamp(),
      });
      toast({
        title: 'Success',
        description: 'New expense type added successfully.',
      });
      reset();
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
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>Add Expense Type</DialogTitle>
            <DialogDescription>
              Create a new category for your expenses.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Type Name</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Security Services"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
             <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Type
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
