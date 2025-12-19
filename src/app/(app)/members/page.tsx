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
    // If no start date, we can't calculate monthly dues. Return only previous dues.
    if (!member.maintenanceStartDate) {
      return member.previousDues || 0;
    }
      
    const memberTransactions = transactions?.filter(t => t.memberId === member.id && t.type === 'maintenance') || [];
    
    let totalDues = member.previousDues || 0;
    
    const startDate = member.maintenanceStartDate.toDate();
    const endDate = member.maintenanceEndDate ? member.maintenanceEndDate.toDate() : new Date();
    const today = new Date();

    // Iterate from start month to current month
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    
    while (currentDate <= endDate && currentDate <= today) {
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), member.monthlyDueDate);
        
        // If due date for this month has passed
        if (today > dueDate) {
            const monthYearString = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            // Check if payment was made for this month
            const paidForMonth = memberTransactions.some(t => t.month && t.month.toLowerCase() === monthYearString.toLowerCase());

            if (!paidForMonth) {
                totalDues += member.monthlyMaintenance;
            }
        }
        
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    // Subtract paid amounts
    // This simple subtraction is not quite right if a member overpays, but it's a start.
    // A more complex ledger system would be needed for full accuracy.
    const actualPaid = memberTransactions.reduce((acc, t) => acc + t.amount, 0);
    const duesAfterPayments = totalDues - actualPaid;


    return duesAfterPayments > 0 ? duesAfterPayments : 0;
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
