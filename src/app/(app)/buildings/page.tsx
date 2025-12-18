'use client';

import React, { useState, useMemo } from 'react';
import { PlusCircle, MoreHorizontal } from 'lucide-react';
import {
  collection,
  doc,
} from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
import { BuildingForm } from '@/components/buildings/BuildingForm';

// Define the shape of a building object
export type Building = {
  id: string;
  buildingName: string;
  address: string;
  createdAt?: any;
};

export default function BuildingsPage() {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | undefined>(undefined);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [buildingToDelete, setBuildingToDelete] = useState<Building | null>(null);

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
    setSelectedBuilding(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (building: Building) => {
    setSelectedBuilding(building);
    setDialogOpen(true);
  };

  const openDeleteDialog = (building: Building) => {
    setBuildingToDelete(building);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (firestore && buildingToDelete) {
      const docRef = doc(firestore, 'buildings', buildingToDelete.id);
      deleteDocumentNonBlocking(docRef);
      setDeleteDialogOpen(false);
      setBuildingToDelete(null);
    }
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
  
  return (
    <>
      <PageHeader title="Buildings">
        <Button size="sm" className="gap-1" onClick={handleAdd}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Building
          </span>
        </Button>
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
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
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
                      <Skeleton className="h-9 w-[50px]" />
                    </TableCell>
                  </TableRow>
                   <TableRow>
                    <TableCell>
                      <Skeleton className="h-4 w-[200px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-[250px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-[50px]" />
                    </TableCell>
                  </TableRow>
                </>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-destructive">
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
                          <DropdownMenuItem onClick={() => handleEdit(building)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDeleteDialog(building)} className="text-destructive">Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedBuildings?.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No buildings found. Click &quot;Add Building&quot; to get started.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <BuildingForm 
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        building={selectedBuilding}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the building and all associated data (members, transactions, etc.).
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
