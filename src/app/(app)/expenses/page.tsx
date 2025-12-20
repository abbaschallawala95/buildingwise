'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import { collectionGroup, doc } from 'firebase/firestore';
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
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { collection } from 'firebase/firestore';
import type { ExpenseType } from '@/components/expenses/AddExpenseTypeDialog';

export type Expense = {
  id: string;
  buildingId: string;
  expenseType: string;
  description: string;
  amount: number;
  expenseDate: any; // Can be a string or a Firestore Timestamp
  createdAt?: any;
};

export default function ExpensesPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  
  const expensesCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'expenses') : null),
    [firestore]
  );
  
  const expenseTypesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'expenseTypes') : null),
    [firestore]
  );
  
  const {
    data: buildings,
    isLoading: isLoadingBuildings,
  } = useCollection<Building>(buildingsCollection);

  const { 
    data: expenses,
    isLoading: isLoadingExpenses,
    error 
  } = useCollection<Expense>(expensesCollectionGroup);

  const {
    data: expenseTypes,
    isLoading: isLoadingExpenseTypes,
  } = useCollection<ExpenseType>(expenseTypesCollection);


  const isLoading = isLoadingBuildings || isLoadingExpenses || isLoadingExpenseTypes;

  const handleAdd = () => {
    setSelectedExpense(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setDialogOpen(true);
  };

  const openDeleteDialog = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (firestore && expenseToDelete) {
      const docRef = doc(firestore, 'buildings', expenseToDelete.buildingId, 'expenses', expenseToDelete.id);
      deleteDocumentNonBlocking(docRef);
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
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
  };

  const sortedExpenses = useMemo(() => {
    if (!expenses) return [];
    return [...expenses].sort((a, b) => {
      const aDate = a.expenseDate?.seconds || 0;
      const bDate = b.expenseDate?.seconds || 0;
      if (aDate < bDate) return 1;
      if (aDate > bDate) return -1;
      return 0;
    });
  }, [expenses]);
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
    return new Date(date).toLocaleDateString();
  }

  return (
    <>
      <PageHeader title="Expenses">
        <Button size="sm" className="gap-1" onClick={handleAdd}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Expense
          </span>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
          <CardDescription>
            A log of all recorded expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Building</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
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
                    <TableCell><Skeleton className="h-6 w-[70px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px] ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-9 w-[50px] ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
                    Error loading expenses: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell>{getBuildingName(expense.buildingId)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{expense.expenseType}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell className="text-right">{formatCurrency(expense.amount)}</TableCell>
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
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(expense)} className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedExpenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No expenses found. Click "Add Expense" to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <ExpenseForm
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        expense={selectedExpense}
        buildings={buildings || []}
        expenseTypes={expenseTypes || []}
      />
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this expense record.
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
