'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { ExtraCollection } from '@/app/(app)/extra-collections/page';
import type { Building } from '@/app/(app)/buildings/page';

const extraCollectionSchema = z.object({
  buildingId: z.string().min(1, 'Please select a building.'),
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  totalAmount: z.coerce.number().min(1, 'Amount must be greater than 0.'),
  date: z.date({
    required_error: "A collection date is required.",
  }),
});

type ExtraCollectionFormValues = z.infer<typeof extraCollectionSchema>;

interface ExtraCollectionFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collection?: ExtraCollection;
  buildings: Building[];
}

export function ExtraCollectionForm({ isOpen, setIsOpen, collection: existingCollection, buildings }: ExtraCollectionFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ExtraCollectionFormValues>({
    resolver: zodResolver(extraCollectionSchema),
  });

  const collectionDate = watch('date');

  useEffect(() => {
    if (isOpen) {
        if (existingCollection) {
          reset({
            buildingId: existingCollection.buildingId,
            title: existingCollection.title,
            totalAmount: existingCollection.totalAmount,
            date: existingCollection.date.toDate ? existingCollection.date.toDate() : new Date(existingCollection.date),
          });
        } else {
          reset({
            buildingId: '',
            title: '',
            totalAmount: 0,
            date: new Date(),
          });
        }
    }
  }, [existingCollection, reset, isOpen]);

  const onSubmit: SubmitHandler<ExtraCollectionFormValues> = async (data) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    const dataToSave = {
      ...data,
      date: Timestamp.fromDate(data.date),
      paidMembers: [], // Initialize with an empty array
    };

    try {
      if (existingCollection) {
        // Update functionality to be added later
        toast({
          title: 'Note',
          description: 'Update functionality is not yet implemented.',
        });
      } else {
        // Add new collection to the subcollection of the selected building
        const collectionRef = collection(firestore, 'buildings', data.buildingId, 'extraCollections');
        addDocumentNonBlocking(collectionRef, {
            ...dataToSave,
            createdAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Extra collection added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save collection.',
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{existingCollection ? 'Edit Collection' : 'New Extra Collection'}</DialogTitle>
            <DialogDescription>
              {existingCollection ? 'Update the details of the collection.' : 'Fill in the information for the new collection.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="buildingId">Building</Label>
                <Select
                    onValueChange={(value) => setValue('buildingId', value)}
                    defaultValue={existingCollection?.buildingId}
                    disabled={!!existingCollection} // Disable if editing
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a building" />
                    </SelectTrigger>
                    <SelectContent>
                        {buildings.map((building) => (
                        <SelectItem key={building.id} value={building.id}>
                            {building.buildingName}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.buildingId && <p className="text-sm text-destructive">{errors.buildingId.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" {...register('title')} placeholder="e.g., Diwali Celebration"/>
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="totalAmount">Total Amount</Label>
                    <Input id="totalAmount" type="number" {...register('totalAmount')} />
                    {errors.totalAmount && <p className="text-sm text-destructive">{errors.totalAmount.message}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="date">Collection Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !collectionDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {collectionDate ? format(collectionDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={collectionDate}
                            onSelect={(date) => setValue('date', date as Date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {existingCollection ? 'Save Changes' : 'Add Collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
