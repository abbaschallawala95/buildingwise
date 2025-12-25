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
import type { UserProfile } from '@/app/(app)/profile/page';
import { Trash2 } from 'lucide-react';
import { createLog } from '@/lib/logger';


interface DeleteUserDialogProps {
    user: UserProfile;
}

export function DeleteUserDialog({ user }: DeleteUserDialogProps) {
    const firestore = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    
    const isSuperAdmin = user.email === 'abbas@example.com';

    const handleDelete = () => {
        if (!firestore) return;
        if (isSuperAdmin) {
             toast({
                variant: 'destructive',
                title: 'Action Forbidden',
                description: 'The super admin account cannot be deleted.',
            });
            setIsOpen(false);
            return;
        }

        const docRef = doc(firestore, 'users', user.id);
        deleteDocumentNonBlocking(docRef);
        // Note: This does not delete the user from Firebase Auth to prevent re-registration issues.
        // The user will no longer be able to log in due to the missing Firestore document.
        createLog(firestore, auth, {
            action: 'deleted',
            entityType: 'Member', // This should be 'User' but keeping as per existing types
            entityId: user.id,
            description: `Deleted user: ${user.fullName}`,
        });
        toast({
            title: 'Success',
            description: 'User deleted successfully.',
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
                disabled={isSuperAdmin}
            >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete User
            </DropdownMenuItem>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the user&apos;s profile from the database. They will no longer be able to log in.
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
