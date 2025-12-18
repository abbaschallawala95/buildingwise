'use client';

import { useEffect, useState } from 'react';
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

import type { Expense } from '@/app/(app)/expenses/page';
import type { Building } from '@/app/(app)/buildings/page';

const expenseSchema = z.object({
  buildingId: z.string().min(1, 'Please select a building.'),
  expenseType: z.enum(['light', 'lift', 'water', 'repair', 'other']),
  description: z.string().min(3, 'Description must be at least 3 characters.'),
  amount: z.coerce.number().min(1, 'Amount must be greater than 0.'),
  expenseDate: z.date({
    required_error: "An expense date is required.",
  }),
});

type ExpenseFormValues = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  expense?: Expense;
  buildings: Building[];
}

export function ExpenseForm({ isOpen, setIsOpen, expense, buildings }: ExpenseFormProps) {
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
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
  });

  const expenseDate = watch('expenseDate');

  useEffect(() => {
    if (isOpen) {
        if (expense) {
          reset({
            buildingId: expense.buildingId,
            expenseType: expense.expenseType,
            description: expense.description,
            amount: expense.amount,
            expenseDate: expense.expenseDate.toDate ? expense.expenseDate.toDate() : new Date(expense.expenseDate),
          });
        } else {
          reset({
            buildingId: '',
            expenseType: 'other',
            description: '',
            amount: 0,
            expenseDate: new Date(),
          });
        }
    }
  }, [expense, reset, isOpen]);

  const onSubmit: SubmitHandler<ExpenseFormValues> = async (data) => {
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
      expenseDate: Timestamp.fromDate(data.expenseDate),
    };

    try {
      if (expense) {
        // Update existing expense
        const docRef = doc(firestore, 'buildings', expense.buildingId, 'expenses', expense.id);
        updateDocumentNonBlocking(docRef, dataToSave);
        toast({
          title: 'Success',
          description: 'Expense updated successfully.',
        });
      } else {
        // Add new expense to the subcollection of the selected building
        const collectionRef = collection(firestore, 'buildings', data.buildingId, 'expenses');
        addDocumentNonBlocking(collectionRef, {
            ...dataToSave,
            createdAt: serverTimestamp(),
        });
        toast({
          title: 'Success',
          description: 'Expense added successfully.',
        });
      }
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'Could not save expense.',
      });
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogHeader>
            <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
            <DialogDescription>
              {expense ? 'Update the details of the expense.' : 'Fill in the information for the new expense.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
                <Label htmlFor="buildingId">Building</Label>
                <Select
                    onValueChange={(value) => setValue('buildingId', value)}
                    defaultValue={expense?.buildingId}
                    disabled={!!expense} // Disable if editing
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
                <Label htmlFor="expenseType">Expense Type</Label>
                <Select
                    onValueChange={(value) => setValue('expenseType', value as any)}
                    defaultValue={expense?.expenseType || 'other'}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select an expense type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">Light Bill</SelectItem>
                        <SelectItem value="lift">Lift Maintenance</SelectItem>
                        <SelectItem value="water">Water Bill</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                </Select>
                {errors.expenseType && <p className="text-sm text-destructive">{errors.expenseType.message}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" {...register('description')} />
              {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" type="number" {...register('amount')} />
                    {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="expenseDate">Expense Date</Label>
                     <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !expenseDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {expenseDate ? format(expenseDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={expenseDate}
                            onSelect={(date) => setValue('expenseDate', date as Date)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    {errors.expenseDate && <p className="text-sm text-destructive">{errors.expenseDate.message}</p>}
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {expense ? 'Save Changes' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
