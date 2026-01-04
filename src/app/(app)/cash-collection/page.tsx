'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Building } from '@/app/(app)/buildings/page';
import type { UserProfile } from '@/app/(app)/profile/page';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CashCollectionForm } from '@/components/cash-collection/CashCollectionForm';
import { useToast } from '@/hooks/use-toast';

export type CashCollection = {
  id: string;
  buildingId: string;
  collectedBy: string;
  totalAmount: number;
  date: any; // Firestore Timestamp
  type: 'cash' | 'online';
  notes?: string;
  denominations?: {
    [key: string]: number;
  };
  paymentMode?: string;
  transactionId?: string;
  createdAt?: any;
};

export default function CashCollectionPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CashCollection | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<CashCollection | null>(null);

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  const cashCollectionsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'cashCollections') : null),
    [firestore]
  );

  const { data: buildings, isLoading: isLoadingBuildings } = useCollection<Building>(buildingsCollection);
  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersCollection);
  const { data: collections, isLoading: isLoadingCollections, error } = useCollection<CashCollection>(cashCollectionsCollection);

  const isLoading = isLoadingBuildings || isLoadingUsers || isLoadingCollections;

  const buildingMap = useMemo(() => new Map(buildings?.map(b => [b.id, b.buildingName])), [buildings]);
  const userMap = useMemo(() => new Map(users?.map(u => [u.id, u.fullName])), [users]);

  const handleAdd = () => {
    setSelectedCollection(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (collection: CashCollection) => {
    setSelectedCollection(collection);
    setDialogOpen(true);
  };

  const openDeleteDialog = (collection: CashCollection) => {
    setCollectionToDelete(collection);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (firestore && collectionToDelete) {
      const docRef = doc(firestore, 'cashCollections', collectionToDelete.id);
      deleteDocumentNonBlocking(docRef);
      toast({
        title: 'Success',
        description: 'Collection record deleted successfully.',
      });
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);

  const sortedCollections = useMemo(() => {
    if (!collections) return [];
    return [...collections].sort((a, b) => {
      const aDate = a.date?.seconds || 0;
      const bDate = b.date?.seconds || 0;
      return bDate - aDate;
    });
  }, [collections]);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  };

  return (
    <>
      <PageHeader title="Cash & Online Collections">
        <Button size="sm" className="gap-1" onClick={handleAdd}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            New Collection
          </span>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Collection History</CardTitle>
          <CardDescription>A log of all recorded cash and online collections.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-[50px] ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Error loading collections: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedCollections.map((collection) => (
                  <TableRow key={collection.id}>
                    <TableCell>{formatDate(collection.date)}</TableCell>
                    <TableCell>{buildingMap.get(collection.buildingId) || '...'}</TableCell>
                    <TableCell>{userMap.get(collection.collectedBy) || '...'}</TableCell>
                    <TableCell>
                      <Badge variant={collection.type === 'cash' ? 'secondary' : 'default'} className="capitalize">{collection.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium truncate max-w-xs">{collection.notes || 'N/A'}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collection.totalAmount)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEdit(collection)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(collection)} className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedCollections.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No collections found. Click "New Collection" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <CashCollectionForm
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        collectionToEdit={selectedCollection}
        buildings={buildings || []}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this collection record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
