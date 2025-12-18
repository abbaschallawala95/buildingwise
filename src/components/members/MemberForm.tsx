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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

import type { Member } from '@/app/(app)/members/page';
import type { Building } from '@/app/(app)/buildings/page';

const memberSchema = z.object({
  buildingId: z.string().min(1, 'Please select a building.'),
  fullName: z.string().min(3, 'Full name must be at least 3 characters.'),
  flatNumber: z.string().min(1, 'Flat number is required.'),
  floor: z.string().min(1, 'Floor is required.'),
  contactNumber: z.string().min(10, 'Contact number must be at least 10 digits.'),
  monthlyMaintenance: z.coerce.number().min(0, 'Maintenance cannot be negative.'),
  previousDues: z.coerce.number().min(0, 'Dues cannot be negative.'),
});

type MemberFormValues = z.infer<typeof memberSchema>;

interface MemberFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  member?: Member;
  buildings: Building[];
}

export function MemberForm({ isOpen, setIsOpen, member, buildings }: MemberFormProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
        monthlyMaintenance: 0,
        previousDues: 0,
    }
  });

  useEffect(() => {
    if (isOpen) {
        if (member) {
          reset({
            buildingId: member.buildingId,
            fullName: member.fullName,
            flatNumber: member.flatNumber,
            floor: member.floor,
            contactNumber: member.contactNumber,
            monthlyMaintenance: member.monthlyMaintenance,
            previousDues: member.previousDues,
          });
        } else {
          reset({
            buildingId: '',
            fullName: '',
            flatNumber: '',
            floor: '',
            contactNumber: '',
            monthlyMaintenance: 0,
            previousDues: 0,
          });
        }
    }
  }, [member, reset, isOpen]);

  const onSubmit: SubmitHandler<MemberFormValues> = async (data) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    try {
      if (member) {
        // Update existing member
        const docRef = doc(firestore, 'buildings', member.buildingId, 'members', member.id);
        updateDocumentNonBlocking(docRef, data);
        toast({
          title: 'Success',
          description: 'Member updated successfully.',
        });
      } else {
        // Add new member to the subcollection of the selected building
        const collectionRef = collection(firestore, 'buildings', data.buildingId, 'members');
        addDocumentNonBlocking(collectionRef, {
            ...data,
            createdAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Member added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save member.',
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{member ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {member ? 'Update the details of the member.' : 'Fill in the information for the new member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="buildingId">Building</Label>
                <Select
                    onValueChange={(value) => setValue('buildingId', value)}
                    defaultValue={member?.buildingId}
                    disabled={!!member} // Disable if editing
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
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" {...register('fullName')} />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="flatNumber">Flat Number</Label>
                    <Input id="flatNumber" {...register('flatNumber')} />
                    {errors.flatNumber && <p className="text-sm text-destructive">{errors.flatNumber.message}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="floor">Floor</Label>
                    <Input id="floor" {...register('floor')} />
                    {errors.floor && <p className="text-sm text-destructive">{errors.floor.message}</p>}
                </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" type="tel" {...register('contactNumber')} />
              {errors.contactNumber && <p className="text-sm text-destructive">{errors.contactNumber.message}</p>}
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="monthlyMaintenance">Monthly Maintenance</Label>
                    <Input id="monthlyMaintenance" type="number" {...register('monthlyMaintenance')} />
                    {errors.monthlyMaintenance && <p className="text-sm text-destructive">{errors.monthlyMaintenance.message}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="previousDues">Previous Dues</Label>
                    <Input id="previousDues" type="number" {...register('previousDues')} />
                    {errors.previousDues && <p className="text-sm text-destructive">{errors.previousDues.message}</p>}
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {member ? 'Save Changes' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
