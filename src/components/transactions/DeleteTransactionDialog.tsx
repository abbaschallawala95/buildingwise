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
} from '@/components/ui/alert-dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useFirestore, deleteDocumentNonBlocking, useAuth } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import type { Transaction } from '@/app/(app)/transactions/page';
import { Trash2 } from 'lucide-react';
import { createLog } from '@/lib/logger';


interface DeleteTransactionDialogProps {
    transaction: Transaction;
}

export function DeleteTransactionDialog({ transaction }: DeleteTransactionDialogProps) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = () => {
        if (!firestore) return;
        const docRef = doc(firestore, 'buildings', transaction.buildingId, 'transactions', transaction.id);
        deleteDocumentNonBlocking(docRef);
         createLog(firestore, auth, {
            action: 'deleted',
            entityType: 'Transaction',
            entityId: transaction.id,
            description: `Deleted transaction: ${transaction.title} for ${transaction.amount}`,
        });
        toast({
            title: 'Success',
            description: 'Transaction deleted successfully.',
        });
        setIsOpen(false);
    };

    return (
        <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                    e.preventDefault();
                    setIsOpen(true);
                }}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
            </DropdownMenuItem>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this transaction record.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
