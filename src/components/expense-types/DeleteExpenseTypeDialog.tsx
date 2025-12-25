'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useFirestore, deleteDocumentNonBlocking, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { ExpenseType } from '@/app/(app)/expense-types/page';
import { Trash2 } from 'lucide-react';
import { createLog } from '@/lib/logger';

interface DeleteExpenseTypeDialogProps {
  expenseType: ExpenseType;
}

export function DeleteExpenseTypeDialog({ expenseType }: DeleteExpenseTypeDialogProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'expenseTypes', expenseType.id);
    deleteDocumentNonBlocking(docRef);
    createLog(firestore, auth, {
        action: 'deleted',
        entityType: 'Expense Type',
        entityId: expenseType.id,
        description: `Deleted expense type: ${expenseType.name}`,
    });
    toast({
      title: 'Success',
      description: 'Expense type deleted successfully.',
    });
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete Expense Type</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the expense type. Make sure no expenses are using this category.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
