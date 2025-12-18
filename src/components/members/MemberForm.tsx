'use client';

import { useEffect, useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
  maintenanceStartDate: z.date({ required_error: 'Start date is required.'}),
  maintenanceEndDate: z.date().optional(),
  monthlyDueDate: z.coerce.number().min(1, 'Due date must be between 1 and 28.').max(28, 'Due date must be between 1 and 28.'),
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
    formState: { errors, isSubmitting },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
        monthlyMaintenance: 0,
        previousDues: 0,
        monthlyDueDate: 10,
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
            maintenanceStartDate: member.maintenanceStartDate 
                ? (member.maintenanceStartDate.toDate ? member.maintenanceStartDate.toDate() : new Date(member.maintenanceStartDate))
                : new Date(),
            maintenanceEndDate: member.maintenanceEndDate 
                ? (member.maintenanceEndDate.toDate ? member.maintenanceEndDate.toDate() : new Date(member.maintenanceEndDate))
                : undefined,
            monthlyDueDate: member.monthlyDueDate,
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
            maintenanceStartDate: new Date(),
            maintenanceEndDate: undefined,
            monthlyDueDate: 10,
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
    
    const dataToSave: any = {
      ...data,
      maintenanceStartDate: Timestamp.fromDate(data.maintenanceStartDate),
    };
    
    if (data.maintenanceEndDate) {
        dataToSave.maintenanceEndDate = Timestamp.fromDate(data.maintenanceEndDate);
    } else {
        dataToSave.maintenanceEndDate = null;
    }


    try {
      if (member) {
        const docRef = doc(firestore, 'buildings', member.buildingId, 'members', member.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({
          title: 'Success',
          description: 'Member updated successfully.',
        });
      } else {
        const collectionRef = collection(firestore, 'buildings', data.buildingId, 'members');
        addDocumentNonBlocking(collectionRef, {
            ...dataToSave,
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
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{member ? 'Edit Member' : 'Add New Member'}</DialogTitle>
            <DialogDescription>
              {member ? 'Update the details of the member.' : 'Fill in the information for the new member.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6 pl-1">
            <div className="grid gap-2">
                <Label htmlFor="buildingId">Building</Label>
                <Controller
                  name="buildingId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!member}
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
                  )}
                />
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
                    <Label htmlFor="previousDues">Opening Dues</Label>
                    <Input id="previousDues" type="number" {...register('previousDues')} />
                    {errors.previousDues && <p className="text-sm text-destructive">{errors.previousDues.message}</p>}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label>Maintenance Start Date</Label>
                    <Controller
                        name="maintenanceStartDate"
                        control={control}
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                    {errors.maintenanceStartDate && <p className="text-sm text-destructive">{errors.maintenanceStartDate.message}</p>}
                </div>
                 <div className="grid gap-2">
                    <Label>Maintenance End Date (Optional)</Label>
                    <Controller
                        name="maintenanceEndDate"
                        control={control}
                        render={({ field }) => (
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !field.value && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                    mode="single"
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    />
                                </PopoverContent>
                            </Popover>
                        )}
                    />
                </div>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="monthlyDueDate">Monthly Due Date (Day of Month)</Label>
                <Input id="monthlyDueDate" type="number" {...register('monthlyDueDate')} />
                {errors.monthlyDueDate && <p className="text-sm text-destructive">{errors.monthlyDueDate.message}</p>}
            </div>
          </div>
          <DialogFooter className="mt-4">
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
