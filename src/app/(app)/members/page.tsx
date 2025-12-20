'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { collection, collectionGroup } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { MemberForm } from '@/components/members/MemberForm';
import { DeleteMember } from '@/components/members/DeleteMember';
import { EditMember } from '@/components/members/EditMember';
import type { Transaction } from '../transactions/page';

export type Member = {
  id: string;
  buildingId: string;
  fullName: string;
  flatNumber: string;
  floor: string;
  contactNumber: string;
  monthlyMaintenance: number;
  previousDues: number;
  maintenanceStartDate: any; // Firestore Timestamp
  maintenanceEndDate?: any; // Firestore Timestamp
  monthlyDueDate: number; // Day of the month
  createdAt?: any;
};

export default function MembersPage() {
  const firestore = useFirestore();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  // Firestore collections
  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  
  const membersCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'members') : null),
    [firestore]
  );
  
  const transactionsCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'transactions') : null),
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

  const {
    data: transactions,
    isLoading: isLoadingTransactions,
  } = useCollection<Transaction>(transactionsCollectionGroup);

  const isLoading = isLoadingBuildings || isLoadingMembers || isLoadingTransactions;

  const handleAdd = () => {
    setIsAddFormOpen(true);
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

  const calculateTotalDues = (member: Member) => {
    if (!member.maintenanceStartDate?.toDate) {
      return member.previousDues || 0;
    }
  
    const memberTransactions = transactions?.filter(t => t.memberId === member.id && t.type === 'maintenance') || [];
    let totalDues = member.previousDues || 0;
  
    const startDate = member.maintenanceStartDate.toDate();
    const today = new Date();
    // Use midnight of today for consistent date comparisons
    const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
    const endDate = member.maintenanceEndDate?.toDate ? member.maintenanceEndDate.toDate() : todayAtMidnight;
  
    // Start iterating from the first day of the start month
    let iteratorDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  
    while (iteratorDate <= endDate) {
      // Create the due date for the current month in the loop
      const currentMonthDueDate = new Date(iteratorDate.getFullYear(), iteratorDate.getMonth(), member.monthlyDueDate);
  
      // Only consider dues for months that have already started and where the due date has passed
      if (iteratorDate <= todayAtMidnight && currentMonthDueDate < todayAtMidnight) {
        const monthYearString = iteratorDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  
        // Check if a payment was made for this specific month
        const paidForMonth = memberTransactions.some(t => t.month && t.month.toLowerCase() === monthYearString.toLowerCase());
  
        if (!paidForMonth) {
          totalDues += member.monthlyMaintenance;
        }
      }
  
      // Move to the next month
      iteratorDate.setMonth(iteratorDate.getMonth() + 1);
    }
  
    return totalDues;
  };


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
                sortedMembers.map((member) => {
                  const totalDues = calculateTotalDues(member);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.fullName}</TableCell>
                      <TableCell>{getBuildingName(member.buildingId)}</TableCell>
                      <TableCell>{member.flatNumber}</TableCell>
                      <TableCell>{formatCurrency(member.monthlyMaintenance)}</TableCell>
                      <TableCell>
                        <Badge variant={totalDues > 0 ? 'destructive' : 'secondary'}>
                          {formatCurrency(totalDues)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <EditMember member={member} buildings={buildings || []} />
                            <DeleteMember member={member} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

      {/* Add Form */}
      <MemberForm 
        isOpen={isAddFormOpen}
        setIsOpen={setIsAddFormOpen}
        buildings={buildings || []}
      />
    </>
  );
}
