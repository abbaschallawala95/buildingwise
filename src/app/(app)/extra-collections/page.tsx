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
import { extraCollections, buildings, members } from "@/lib/data";
import { Progress } from "@/components/ui/progress";

export default function ExtraCollectionsPage() {
    const formatCurrency = (amount: number) => 
        new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  const getCollectionProgress = (collection: typeof extraCollections[0]) => {
    const totalMembers = members.filter(m => m.buildingId === collection.buildingId).length;
    if (totalMembers === 0) return 0;
    return (collection.paidMembers.length / totalMembers) * 100;
  }

  return (
    <>
      <PageHeader title="Extra Collections">
        <Button size="sm" className="gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            New Collection
          </span>
        </Button>
      </PageHeader>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {extraCollections.map((collection) => (
          <Card key={collection.id}>
            <CardHeader>
              <CardTitle>{collection.title}</CardTitle>
              <CardDescription>{buildings.find(b => b.id === collection.buildingId)?.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted-foreground">Total Amount</span>
                <span className="text-xl font-bold">{formatCurrency(collection.totalAmount)}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span>{collection.paidMembers.length} / {members.filter(m => m.buildingId === collection.buildingId).length} Paid</span>
                </div>
                <Progress value={getCollectionProgress(collection)} aria-label={`${getCollectionProgress(collection)}% paid`} />
              </div>
              <Button variant="outline" className="w-full">View Details</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
