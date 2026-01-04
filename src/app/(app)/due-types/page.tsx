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
import { DueTypeForm } from '@/components/due-types/DueTypeForm';
import { DeleteDueTypeDialog } from '@/components/due-types/DeleteDueTypeDialog';
import { EditDueType } from '@/components/due-types/EditDueType';

export type DueType = {
  id: string;
  name: string;
  createdAt?: any;
};

interface DueTypesPageProps {
  isUserAdmin?: boolean;
}

export default function DueTypesPage({ isUserAdmin }: DueTypesPageProps) {
  const firestore = useFirestore();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const dueTypesCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'dueTypes') : null),
    [firestore]
  );

  const {
    data: dueTypes,
    isLoading,
    error,
  } = useCollection<DueType>(dueTypesCollection);

  const handleAdd = () => {
    setIsAddFormOpen(true);
  };

  const sortedDueTypes = useMemo(() => {
    if (!dueTypes) return [];
    return [...dueTypes].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        if (a.createdAt.seconds < b.createdAt.seconds) return 1;
        if (a.createdAt.seconds > b.createdAt.seconds) return -1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [dueTypes]);

  return (
    <>
      <PageHeader title="Due Types">
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
          <CardTitle>Due Category List</CardTitle>
          <CardDescription>
            A list of all categories used for dues.
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
                    Error loading due types: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedDueTypes.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.name}</TableCell>
                    {isUserAdmin && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <EditDueType dueType={type} />
                          <DeleteDueTypeDialog dueType={type} />
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {!isLoading && !error && sortedDueTypes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isUserAdmin ? 2 : 1} className="text-center text-muted-foreground">
                    No due types found. {isUserAdmin && `Click "Add Type" to get started.`}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DueTypeForm isOpen={isAddFormOpen} setIsOpen={setIsAddFormOpen} />
    </>
  );
}
