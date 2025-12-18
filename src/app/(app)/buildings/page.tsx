'use client';

import { useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
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

export default function BuildingsPage() {
  const firestore = useFirestore();

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );

  const {
    data: buildings,
    isLoading,
    error,
  } = useCollection(buildingsCollection);

  const BuildingRow = ({ building }: { building: any }) => {
    const [memberCount, setMemberCount] = React.useState(0);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
      if (!firestore) return;
      const membersCol = collection(
        firestore,
        `buildings/${building.id}/members`
      );
      getCountFromServer(membersCol).then((snapshot) => {
        setMemberCount(snapshot.data().count);
        setLoading(false);
      });
    }, [firestore, building.id]);

    return (
      <TableRow key={building.id}>
        <TableCell className="font-medium">{building.buildingName}</TableCell>
        <TableCell>{building.address}</TableCell>
        <TableCell>{loading ? <Skeleton className="h-4 w-8" /> : memberCount}</TableCell>
        <TableCell>
          <Button variant="outline" size="sm">
            Edit
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <>
      <PageHeader title="Buildings">
        <Button size="sm" className="gap-1">
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
                <TableHead>Members</TableHead>
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
                      <Skeleton className="h-4 w-[50px]" />
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
                      <Skeleton className="h-4 w-[50px]" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-9 w-[50px]" />
                    </TableCell>
                  </TableRow>
                </>
              )}
              {error && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    Error loading buildings: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                buildings?.map((building) => (
                  <BuildingRow key={building.id} building={building} />
                ))}
              {!isLoading && !error && buildings?.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No buildings found. Click &quot;Add Building&quot; to get started.
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
