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
import type { DueType } from '@/app/(app)/due-types/page';
import { Trash2 } from 'lucide-react';
import { createLog } from '@/lib/logger';

interface DeleteDueTypeDialogProps {
  dueType: DueType;
}

export function DeleteDueTypeDialog({ dueType }: DeleteDueTypeDialogProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleDelete = () => {
    if (!firestore) return;
    const docRef = doc(firestore, 'dueTypes', dueType.id);
    deleteDocumentNonBlocking(docRef);
    createLog(firestore, auth, {
        action: 'deleted',
        entityType: 'Due Type',
        entityId: dueType.id,
        description: `Deleted due type: ${dueType.name}`,
    });
    toast({
      title: 'Success',
      description: 'Due type deleted successfully.',
    });
    setIsOpen(false);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Delete Due Type</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the due type. Make sure no dues are using this category.
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
