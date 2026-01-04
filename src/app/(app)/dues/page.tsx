'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { collection, collectionGroup, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Building } from '@/app/(app)/buildings/page';
import type { Member } from '@/app/(app)/members/page';
import type { DueType } from '@/app/(app)/due-types/page';


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
import { DueForm } from '@/components/dues/DueForm';


export type Due = {
  id: string;
  buildingId: string;
  memberId: string;
  title: string;
  type: string;
  amount: number;
  dueDate: any; // Firestore Timestamp
  paymentDate?: any; // Firestore Timestamp
  status: 'unpaid' | 'paid';
  createdAt?: any;
};

interface DuesPageProps {
  isUserAdmin?: boolean;
}

export default function DuesPage({ isUserAdmin }: DuesPageProps) {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDue, setSelectedDue] = useState<Due | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dueToDelete, setDueToDelete] = useState<Due | null>(null);

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  const membersCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'members') : null),
    [firestore]
  );
  const duesCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'dues') : null),
    [firestore]
  );
  const dueTypesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'dueTypes') : null),
    [firestore]
  );
  
  const { data: buildings, isLoading: isLoadingBuildings } = useCollection<Building>(buildingsCollection);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersCollectionGroup);
  const { data: dues, isLoading: isLoadingDues, error } = useCollection<Due>(duesCollectionGroup);
  const { data: dueTypes, isLoading: isLoadingDueTypes } = useCollection<DueType>(dueTypesCollection);

  const isLoading = isLoadingBuildings || isLoadingMembers || isLoadingDues || isLoadingDueTypes;

  const buildingMap = useMemo(() => new Map(buildings?.map(b => [b.id, b.buildingName])), [buildings]);
  const memberMap = useMemo(() => new Map(members?.map(m => [m.id, m])), [members]);

  const handleAdd = () => {
    setSelectedDue(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (due: Due) => {
    setSelectedDue(due);
    setDialogOpen(true);
  };

  const openDeleteDialog = (due: Due) => {
    setDueToDelete(due);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (firestore && dueToDelete) {
      const docRef = doc(firestore, 'buildings', dueToDelete.buildingId, 'dues', dueToDelete.id);
      deleteDocumentNonBlocking(docRef);
      setDeleteDialogOpen(false);
      setDueToDelete(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  
  const getMemberName = (memberId: string) => {
    const member = memberMap.get(memberId);
    return member ? `${member.fullName} (${member.flatNumber})` : '...';
  };
  
  const sortedDues = useMemo(() => {
    if (!dues) return [];
    return [...dues].sort((a, b) => {
      const aDate = a.dueDate?.seconds || 0;
      const bDate = b.dueDate?.seconds || 0;
      if (aDate < bDate) return 1;
      if (aDate > bDate) return -1;
      return 0;
    });
  }, [dues]);
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  }

  return (
    <>
      <PageHeader title="Dues">
        {isUserAdmin && (
          <Button size="sm" className="gap-1" onClick={handleAdd}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              New Due
            </span>
          </Button>
        )}
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Dues History</CardTitle>
          <CardDescription>
            A log of all recorded one-off dues for members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Due Date</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {isUserAdmin && <TableHead><span className="sr-only">Actions</span></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    {isUserAdmin && <TableCell><Skeleton className="h-9 w-[50px] ml-auto" /></TableCell>}
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 9 : 8} className="text-center text-destructive">
                    Error loading dues: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedDues.map((due) => (
                  <TableRow key={due.id}>
                    <TableCell>{formatDate(due.dueDate)}</TableCell>
                    <TableCell>{due.status === 'paid' ? formatDate(due.paymentDate) : 'N/A'}</TableCell>
                    <TableCell>{getMemberName(due.memberId)}</TableCell>
                    <TableCell>{buildingMap.get(due.buildingId) || '...'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{due.type}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{due.title}</TableCell>
                    <TableCell>
                      <Badge variant={due.status === 'paid' ? 'secondary' : 'destructive'} className="capitalize">
                        {due.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(due.amount)}</TableCell>
                    {isUserAdmin && (
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
                            <DropdownMenuItem onClick={() => handleEdit(due)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openDeleteDialog(due)} className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {!isLoading && !error && sortedDues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 9 : 8} className="text-center text-muted-foreground">
                    No dues found. {isUserAdmin && `Click "New Due" to get started.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <DueForm
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        due={selectedDue}
        buildings={buildings || []}
        members={members || []}
        dueTypes={dueTypes || []}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this due record.
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
