'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';

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
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

import type { Building } from '@/app/(app)/buildings/page';

const buildingSchema = z.object({
  buildingName: z.string().min(3, 'Building name must be at least 3 characters long.'),
  address: z.string().min(5, 'Address must be at least 5 characters long.'),
  openingBalance: z.coerce.number().min(0, 'Opening balance cannot be negative.'),
});

type BuildingFormValues = z.infer<typeof buildingSchema>;

interface BuildingFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  building?: Building;
}

export function BuildingForm({ isOpen, setIsOpen, building }: BuildingFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BuildingFormValues>({
    resolver: zodResolver(buildingSchema),
    defaultValues: {
      openingBalance: 0,
    }
  });

  useEffect(() => {
    if (building) {
      reset({
        buildingName: building.buildingName,
        address: building.address,
        openingBalance: building.openingBalance || 0,
      });
    } else {
      reset({
        buildingName: '',
        address: '',
        openingBalance: 0,
      });
    }
  }, [building, reset, isOpen]);

  const onSubmit: SubmitHandler<BuildingFormValues> = async (data) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available. Please try again later.',
      });
      return;
    }

    try {
      if (building) {
        // Update existing building
        const docRef = doc(firestore, 'buildings', building.id);
        updateDocumentNonBlocking(docRef, data);
        toast({
          title: 'Success',
          description: 'Building updated successfully.',
        });
      } else {
        // Add new building
        const collectionRef = collection(firestore, 'buildings');
        addDocumentNonBlocking(collectionRef, {
            ...data,
            createdAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Building added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save building.',
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{building ? 'Edit Building' : 'Add New Building'}</DialogTitle>
            <DialogDescription>
              {building ? 'Update the details of the building.' : 'Fill in the information for the new building.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="buildingName">Building Name</Label>
              <Input
                id="buildingName"
                {...register('buildingName')}
              />
              {errors.buildingName && (
                <p className="text-sm text-destructive">{errors.buildingName.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                {...register('address')}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>
             <div className="grid gap-2">
              <Label htmlFor="openingBalance">Opening Balance</Label>
              <Input
                id="openingBalance"
                type="number"
                {...register('openingBalance')}
              />
              {errors.openingBalance && (
                <p className="text-sm text-destructive">{errors.openingBalance.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {building ? 'Save Changes' : 'Add Building'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
