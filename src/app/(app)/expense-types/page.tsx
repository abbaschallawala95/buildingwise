'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';

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
import { ExpenseTypeForm } from '@/components/expense-types/ExpenseTypeForm';
import { DeleteExpenseTypeDialog } from '@/components/expense-types/DeleteExpenseTypeDialog';
import { EditExpenseType } from '@/components/expense-types/EditExpenseType';

export type ExpenseType = {
  id: string;
  name: string;
  createdAt?: any;
};

interface ExpenseTypesPageProps {
  isUserAdmin?: boolean;
}

export default function ExpenseTypesPage({ isUserAdmin }: ExpenseTypesPageProps) {
  const firestore = useFirestore();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const expenseTypesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'expenseTypes') : null),
    [firestore]
  );

  const {
    data: expenseTypes,
    isLoading,
    error,
  } = useCollection<ExpenseType>(expenseTypesCollection);

  const handleAdd = () => {
    setIsAddFormOpen(true);
  };

  const sortedExpenseTypes = useMemo(() => {
    if (!expenseTypes) return [];
    return [...expenseTypes].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        if (a.createdAt.seconds < b.createdAt.seconds) return 1;
        if (a.createdAt.seconds > b.createdAt.seconds) return -1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [expenseTypes]);

  return (
    <>
      <PageHeader title="Expense Types">
        {isUserAdmin && (
          <Button size="sm" className="gap-1" onClick={handleAdd}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Type
            </span>
          </Button>
        )}
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Expense Category List</CardTitle>
          <CardDescription>
            A list of all categories used for expenses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                {isUserAdmin && (
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <>
                  <TableRow>
                    <TableCell>
                      <Skeleton className="h-4 w-[250px]" />
                    </TableCell>
                    {isUserAdmin && (
                      <TableCell>
                        <Skeleton className="h-9 w-[100px] ml-auto" />
                      </TableCell>
                    )}
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    {isUserAdmin && (
                      <TableCell>
                        <Skeleton className="h-9 w-[100px] ml-auto" />
                      </TableCell>
                    )}
                  </TableRow>
                </>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 2 : 1} className="text-center text-destructive">
                    Error loading expense types: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedExpenseTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    {isUserAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditExpenseType expenseType={type} />
                          <DeleteExpenseTypeDialog expenseType={type} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {!isLoading && !error && sortedExpenseTypes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 2 : 1} className="text-center text-muted-foreground">
                    No expense types found. {isUserAdmin && `Click "Add Type" to get started.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseTypeForm isOpen={isAddFormOpen} setIsOpen={setIsAddFormOpen} />
    </>
  );
}
