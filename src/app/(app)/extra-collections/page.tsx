'use client';

import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, collectionGroup } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { Building } from "../buildings/page";
import { useMemo, useState } from "react";
import { ExtraCollectionForm } from "@/components/extra-collections/ExtraCollectionForm";
import type { Member } from "../members/page";

// This type can be expanded and moved to a central types file
export type ExtraCollection = {
  id: string;
  buildingId: string;
  title: string;
  totalAmount: number;
  date: any; // Firestore timestamp
  paidMembers: string[];
}

interface ExtraCollectionsPageProps {
  isUserAdmin?: boolean;
}

export default function ExtraCollectionsPage({ isUserAdmin }: ExtraCollectionsPageProps) {
  const firestore = useFirestore();
  const [dialogOpen, setDialogOpen] = useState(false);

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  
  const extraCollectionsGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'extraCollections') : null),
    [firestore]
  );

  const membersCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'members') : null),
    [firestore]
  );

  const { 
    data: extraCollections, 
    isLoading: loadingCollections, 
    error: collectionsError 
  } = useCollection<ExtraCollection>(extraCollectionsGroup);

  const { 
    data: buildings, 
    isLoading: loadingBuildings, 
    error: buildingsError 
  } = useCollection<Building>(buildingsCollection);
  
  const {
    data: members,
    isLoading: loadingMembers,
    error: membersError,
  } = useCollection<Member>(membersCollectionGroup);

  const isLoading = loadingCollections || loadingBuildings || loadingMembers;

  const buildingMap = useMemo(() => {
    if (!buildings) return new Map();
    return new Map(buildings.map(b => [b.id, b]));
  }, [buildings]);

  const membersByBuilding = useMemo(() => {
    if (!members) return new Map<string, number>();
    return members.reduce((acc, member) => {
      acc.set(member.buildingId, (acc.get(member.buildingId) || 0) + 1);
      return acc;
    }, new Map<string, number>());
  }, [members]);


  const formatCurrency = (amount: number) => 
      new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const getCollectionProgress = (collection: ExtraCollection) => {
    const totalMembers = membersByBuilding.get(collection.buildingId) || 0;
    if (totalMembers === 0) return 0;
    const paidCount = collection.paidMembers?.length || 0;
    return (paidCount / totalMembers) * 100;
  }

  const handleAdd = () => {
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader title="Extra Collections">
        {isUserAdmin && (
          <Button size="sm" className="gap-1" onClick={handleAdd}>
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              New Collection
            </span>
          </Button>
        )}
      </PageHeader>
       {isLoading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({length: 3}).map((_, i) => (
                <Card key={i}>
                    <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
      {(collectionsError || buildingsError || membersError) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-destructive">
              Error loading data: {collectionsError?.message || buildingsError?.message || membersError?.message}
            </p>
          </CardContent>
        </Card>
      )}
      {!isLoading && !collectionsError && !buildingsError && !membersError && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {extraCollections && extraCollections.length > 0 ? (
                extraCollections.map((collection) => {
                  const totalMembersInBuilding = membersByBuilding.get(collection.buildingId) || 0;
                  return (
                    <Card key={collection.id}>
                      <CardHeader>
                        <CardTitle>{collection.title}</CardTitle>
                        <CardDescription>{buildingMap.get(collection.buildingId)?.buildingName || 'Unknown Building'}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-baseline">
                          <span className="text-sm text-muted-foreground">Total Amount</span>
                          <span className="text-xl font-bold">{formatCurrency(collection.totalAmount)}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Progress</span>
                              <span>{collection.paidMembers?.length || 0} / {totalMembersInBuilding} Paid</span>
                          </div>
                          <Progress value={getCollectionProgress(collection)} aria-label={`${getCollectionProgress(collection)}% paid`} />
                        </div>
                        <Button variant="outline" className="w-full">View Details</Button>
                      </CardContent>
                    </Card>
                  )
                })
            ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                    No extra collections found. {isUserAdmin && `Click "New Collection" to get started.`}
                </div>
            )}
        </div>
      )}
      <ExtraCollectionForm 
        isOpen={dialogOpen}
        setIsOpen={setDialogOpen}
        buildings={buildings || []}
      />
    </>
  );
}
