'use client';

import React, { useMemo, useState } from 'react';
import { collection, collectionGroup, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Building } from '@/app/(app)/buildings/page';
import type { Member } from '@/app/(app)/members/page';
import { downloadReceipt } from '@/lib/receipt-pdf';

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
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';

export type Transaction = {
  id: string;
  buildingId: string;
  memberId: string;
  type: 'maintenance' | 'extra_collection';
  title: string;
  amount: number;
  month: string;
  paymentMode: 'Cash' | 'Online' | 'Cheque';
  receiptNumber: string;
  createdAt: any; // Firestore Timestamp
};

export default function TransactionsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

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
  
  const { data: buildings, isLoading: isLoadingBuildings } = useCollection<Building>(buildingsCollection);
  const { data: members, isLoading: isLoadingMembers } = useCollection<Member>(membersCollectionGroup);
  const { data: transactions, isLoading: isLoadingTransactions, error } = useCollection<Transaction>(transactionsCollectionGroup);

  const isLoading = isLoadingBuildings || isLoadingMembers || isLoadingTransactions;

  const buildingMap = useMemo(() => new Map(buildings?.map(b => [b.id, b.buildingName])), [buildings]);
  const memberMap = useMemo(() => new Map(members?.map(m => [m.id, m])), [members]);

  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  }, [transactions]);
  
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    return new Date(date.seconds * 1000).toLocaleString();
  };

  const handleDownload = (tx: Transaction) => {
    const member = memberMap.get(tx.memberId);
    const buildingName = buildingMap.get(tx.buildingId);

    if (!member || !buildingName) {
        toast({
            variant: "destructive",
            title: 'Error',
            description: 'Could not find member or building details to generate PDF.',
        });
        return;
    }

    downloadReceipt({
        transaction: tx,
        member,
        buildingName,
        toast,
    });
  }

  return (
    <>
      <PageHeader title="All Transactions" />
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            A log of all recorded payments across all buildings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Member</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Month</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[130px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-[50px] ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-destructive">
                    Error loading transactions: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedTransactions.map((tx) => {
                  const member = memberMap.get(tx.memberId);
                  return (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.createdAt)}</TableCell>
                      <TableCell>{member ? `${member.fullName} (${member.flatNumber})` : '...'}</TableCell>
                      <TableCell>{buildingMap.get(tx.buildingId) || '...'}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'maintenance' ? 'secondary' : 'default'} className="capitalize">
                            {tx.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>{tx.title}</TableCell>
                      <TableCell>{tx.month}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(tx.amount)}</TableCell>
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
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDownload(tx)}>
                                <Download className="mr-2 h-4 w-4" />
                                Download Receipt
                            </DropdownMenuItem>
                            <DeleteTransactionDialog transaction={tx} />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              {!isLoading && !error && sortedTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No transactions found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
