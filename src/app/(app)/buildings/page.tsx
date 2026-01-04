'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import {
  collection,
} from 'firebase/firestore';
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
import { BuildingForm } from '@/components/buildings/BuildingForm';
import { DeleteBuildingDialog } from '@/components/buildings/DeleteBuildingDialog';
import { EditBuilding } from '@/components/buildings/EditBuilding';

// Define the shape of a building object
export type Building = {
  id: string;
  buildingName: string;
  address: string;
  openingBalance?: number;
  createdAt?: any;
};

interface BuildingsPageProps {
  isUserAdmin?: boolean;
}

export default function BuildingsPage({ isUserAdmin }: BuildingsPageProps) {
  const firestore = useFirestore();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );

  const {
    data: buildings,
    isLoading,
    error,
  } = useCollection<Building>(buildingsCollection);

  const handleAdd = () => {
    setIsAddFormOpen(true);
  };

  const sortedBuildings = useMemo(() => {
    if (!buildings) return [];
    // Sort by createdAt, assuming it's a Firestore Timestamp or a value that can be compared
    return [...buildings].sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        // Assuming createdAt is a Firestore Timestamp
        if (a.createdAt.seconds < b.createdAt.seconds) return 1;
        if (a.createdAt.seconds > b.createdAt.seconds) return -1;
      }
      return 0;
    });
  }, [buildings]);
  
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);

  return (
    <>
      <PageHeader title="Buildings">
        {isUserAdmin && (
          <Button size="sm" className="gap-1" onClick={handleAdd}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Building
            </span>
          </Button>
        )}
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>Building List</CardTitle>
          <CardDescription>A list of all managed buildings.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Building Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Opening Balance</TableHead>
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
                    <TableCell>
                      <Skeleton className="h-4 w-[300px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
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
                    <TableCell>
                      <Skeleton className="h-4 w-[250px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[100px]" />
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
                  <TableCell colSpan={isUserAdmin ? 4 : 3} className="text-center text-destructive">
                    Error loading buildings: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedBuildings.map((building) => (
                  <TableRow key={building.id}>
                    <TableCell className="font-medium">{building.buildingName}</TableCell>
                    <TableCell>{building.address}</TableCell>
                    <TableCell>{formatCurrency(building.openingBalance || 0)}</TableCell>
                    {isUserAdmin && (
                      <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-2">
                              <EditBuilding building={building} />
                              <DeleteBuildingDialog building={building} />
                          </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              {!isLoading && !error && sortedBuildings?.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={isUserAdmin ? 4 : 3} className="text-center text-muted-foreground">
                        No buildings found. {isUserAdmin && `Click "Add Building" to get started.`}
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Add Form */}
      <BuildingForm 
        isOpen={isAddFormOpen}
        setIsOpen={setIsAddFormOpen}
      />
    </>
  );
}
