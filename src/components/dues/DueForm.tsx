'use client';

import { useEffect, useMemo } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  collection,
  doc,
  serverTimestamp,
  Timestamp,
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

import type { Due } from '@/app/(app)/dues/page';
import type { Building } from '@/app/(app)/buildings/page';
import type { Member } from '@/app/(app)/members/page';
import type { DueType } from '@/app/(app)/due-types/page';

const dueSchema = z.object({
  buildingId: z.string().min(1, 'Please select a building.'),
  memberId: z.string().min(1, 'Please select a member.'),
  type: z.string().min(1, 'Please select a due type.'),
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0.'),
  dueDate: z.date({ required_error: "A due date is required." }),
  status: z.enum(['unpaid', 'paid']),
  paymentDate: z.date().optional(),
}).refine(data => {
    if (data.status === 'paid') {
        return !!data.paymentDate;
    }
    return true;
}, {
    message: 'Payment date is required when status is "Paid".',
    path: ['paymentDate'],
});


type DueFormValues = z.infer<typeof dueSchema>;

interface DueFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  due?: Due;
  buildings: Building[];
  members: Member[];
  dueTypes: DueType[];
}

export function DueForm({ isOpen, setIsOpen, due, buildings, members, dueTypes }: DueFormProps) {
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
  } = useForm<DueFormValues>({
    resolver: zodResolver(dueSchema),
    defaultValues: {
      status: 'unpaid',
    }
  });

  const dueDate = watch('dueDate');
  const paymentDate = watch('paymentDate');
  const selectedBuildingId = watch('buildingId');
  const status = watch('status');

  const membersInBuilding = useMemo(() => {
    return members.filter(member => member.buildingId === selectedBuildingId);
  }, [members, selectedBuildingId]);

  const toDateOrUndefined = (fsTimestamp: any) => {
    if (!fsTimestamp) return undefined;
    return fsTimestamp.toDate ? fsTimestamp.toDate() : new Date(fsTimestamp);
  };
  
  useEffect(() => {
    if (isOpen) {
        if (due) {
          reset({
            buildingId: due.buildingId,
            memberId: due.memberId,
            type: due.type,
            title: due.title,
            amount: due.amount,
            dueDate: toDateOrUndefined(due.dueDate),
            status: due.status,
            paymentDate: toDateOrUndefined(due.paymentDate),
          });
        } else {
          reset({
            buildingId: '',
            memberId: '',
            type: '',
            title: '',
            amount: 0,
            dueDate: new Date(),
            status: 'unpaid',
            paymentDate: undefined,
          });
        }
    }
  }, [due, reset, isOpen]);

  const onSubmit: SubmitHandler<DueFormValues> = async (data) => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }

    const dataToSave: Partial<Due> & { [key: string]: any } = {
      ...data,
      dueDate: Timestamp.fromDate(data.dueDate),
      paymentDate: data.paymentDate ? Timestamp.fromDate(data.paymentDate) : null,
    };
    
    if (data.status === 'unpaid') {
        dataToSave.paymentDate = null;
    }


    try {
      if (due) {
        // Update existing due
        const docRef = doc(firestore, 'buildings', due.buildingId, 'dues', due.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({
          title: 'Success',
          description: 'Due updated successfully.',
        });
      } else {
        // Add new due to the subcollection of the selected building
        const collectionRef = collection(firestore, 'buildings', data.buildingId, 'dues');
        addDocumentNonBlocking(collectionRef, {
            ...dataToSave,
            createdAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Due added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save due.',
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{due ? 'Edit Due' : 'Add New Due'}</DialogTitle>
            <DialogDescription>
              {due ? 'Update the details of the due.' : 'Fill in the information for the new due.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-6 pl-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                  <Label htmlFor="buildingId">Building</Label>
                  <Select
                      onValueChange={(value) => {
                        setValue('buildingId', value);
                        setValue('memberId', ''); // Reset member on building change
                      }}
                      defaultValue={due?.buildingId}
                      disabled={!!due} // Disable if editing
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
                  <Label htmlFor="memberId">Member</Label>
                  <Select
                      onValueChange={(value) => setValue('memberId', value)}
                      value={watch('memberId')}
                      disabled={!selectedBuildingId || !!due}
                  >
                      <SelectTrigger>
                          <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                      <SelectContent>
                          {membersInBuilding.map(member => (
                              <SelectItem key={member.id} value={member.id}>
                                  {member.fullName} ({member.flatNumber})
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
                  {errors.memberId && <p className="text-sm text-destructive">{errors.memberId.message}</p>}
              </div>
            </div>
             <div className="grid gap-2">
                <Label htmlFor="type">Due Type</Label>
                <Select
                    onValueChange={(value) => setValue('type', value as any)}
                    defaultValue={due?.type}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select a due type" />
                    </SelectTrigger>
                    <SelectContent>
                        {dueTypes.map(type => (
                            <SelectItem key={type.id} value={type.name}>{type.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-destructive">{errors.type.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title">Title / Description</Label>
              <Input id="title" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" {...register('amount')} />
                    {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                        onValueChange={(value) => setValue('status', value as 'unpaid' | 'paid')}
                        defaultValue={due?.status || 'unpaid'}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='unpaid'>Unpaid</SelectItem>
                            <SelectItem value='paid'>Paid</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={dueDate}
                            onSelect={(date) => setValue('dueDate', date as Date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
                </div>
                {status === 'paid' && (
                  <div className="grid gap-2">
                      <Label htmlFor="paymentDate">Payment Date</Label>
                       <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !paymentDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {paymentDate ? format(paymentDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={paymentDate}
                              onSelect={(date) => setValue('paymentDate', date)}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
                  </div>
                )}
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {due ? 'Save Changes' : 'Add Due'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
