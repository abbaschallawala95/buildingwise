'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Building } from '@/app/(app)/buildings/page';

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
  DropdownMenuSeparator,
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
import { MemberForm } from '@/components/members/MemberForm';

export type Member = {
  id: string;
  buildingId: string;
  fullName: string;
  flatNumber: string;
  floor: string;
  contactNumber: string;
  monthlyMaintenance: number;
  previousDues: number;
  createdAt?: any;
};

export default function MembersPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Firestore collections
  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  
  // Fetch all members from all buildings. For a large number of members,
  // this should be optimized to fetch members only for a selected building.
  const membersCollectionGroup = useMemoFirebase(
    () => (firestore ? collection(firestore, 'members') : null),
    [firestore]
  );
  
  const {
    data: buildings,
    isLoading: isLoadingBuildings,
  } = useCollection<Building>(buildingsCollection);

  const { 
    data: members,
    isLoading: isLoadingMembers,
    error 
  } = useCollection<Member>(membersCollectionGroup);

  const isLoading = isLoadingBuildings || isLoadingMembers;

  const handleAdd = () => {
    setSelectedMember(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setDialogOpen(true);
  };

  const openDeleteDialog = (member: Member) => {
    setMemberToDelete(member);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (firestore && memberToDelete) {
      // Members are in a subcollection, so we need the buildingId
      const docRef = doc(firestore, 'buildings', memberToDelete.buildingId, 'members', memberToDelete.id);
      deleteDocumentNonBlocking(docRef);
      setDeleteDialogOpen(false);
      setMemberToDelete(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  
  const getBuildingName = (buildingId: string) => {
    return buildings?.find(b => b.id === buildingId)?.buildingName || '...';
  }

  const sortedMembers = useMemo(() => {
    if (!members) return [];
    return [...members].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        if (a.createdAt.seconds < b.createdAt.seconds) return 1;
        if (a.createdAt.seconds > b.createdAt.seconds) return -1;
      }
      return 0;
    });
  }, [members]);


  return (
    <>
      <PageHeader title="Members">
        <Button size="sm" className="gap-1" onClick={handleAdd}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Member
          </span>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Member List</CardTitle>
          <CardDescription>
            A list of all members across all buildings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Maintenance</TableHead>
                <TableHead>Dues</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-[50px]" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    Error loading members: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.fullName}</TableCell>
                    <TableCell>{getBuildingName(member.buildingId)}</TableCell>
                    <TableCell>{member.flatNumber}</TableCell>
                    <TableCell>{formatCurrency(member.monthlyMaintenance)}</TableCell>
                    <TableCell>
                      <Badge variant={member.previousDues > 0 ? 'destructive' : 'secondary'}>
                        {formatCurrency(member.previousDues)}
                      </Badge>
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(member)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(member)} className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedMembers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No members found. Click &quot;Add Member&quot; to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MemberForm 
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        member={selectedMember}
        buildings={buildings || []}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the member from the building.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
