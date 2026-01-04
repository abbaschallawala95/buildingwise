'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import { useFirestore, addDocumentNonBlocking, useAuth, updateDocumentNonBlocking } from '@/firebase';
import { format, parseISO } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Building } from '@/app/(app)/buildings/page';
import { createLog } from '@/lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CashCollection } from '@/app/(app)/cash-collection/page';

const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const baseSchema = z.object({
  buildingId: z.string().min(1, 'Please select a building.'),
  date: z.string().min(1, 'A date is required.'),
  notes: z.string().optional(),
});

const cashSchema = baseSchema.extend({
  d500: z.coerce.number().min(0).optional(),
  d200: z.coerce.number().min(0).optional(),
  d100: z.coerce.number().min(0).optional(),
  d50: z.coerce.number().min(0).optional(),
  d20: z.coerce.number().min(0).optional(),
  d10: z.coerce.number().min(0).optional(),
  d5: z.coerce.number().min(0).optional(),
  d2: z.coerce.number().min(0).optional(),
  d1: z.coerce.number().min(0).optional(),
});

const onlineSchema = baseSchema.extend({
    amount: z.coerce.number().min(1, "Amount must be greater than 0."),
    paymentMode: z.string().min(1, "Payment mode is required."),
    transactionId: z.string().min(1, "Transaction ID is required."),
});

type CashFormValues = z.infer<typeof cashSchema>;
type OnlineFormValues = z.infer<typeof onlineSchema>;

interface CashCollectionFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collectionToEdit?: CashCollection;
  buildings: Building[];
}

export function CashCollectionForm({ isOpen, setIsOpen, collectionToEdit, buildings }: CashCollectionFormProps) {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const isEditing = !!collectionToEdit;
  const [activeTab, setActiveTab] = useState(collectionToEdit?.type || 'cash');

  const toInputDate = (fsTimestamp: any) => {
    if (!fsTimestamp) return '';
    const d = fsTimestamp.toDate ? fsTimestamp.toDate() : new Date(fsTimestamp);
    return format(d, 'yyyy-MM-dd');
  };

  const cashForm = useForm<CashFormValues>({
    resolver: zodResolver(cashSchema),
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') },
  });

  const onlineForm = useForm<OnlineFormValues>({
    resolver: zodResolver(onlineSchema),
    defaultValues: { date: format(new Date(), 'yyyy-MM-dd') },
  });
  
  useEffect(() => {
    if(isOpen) {
        const defaultDate = format(new Date(), 'yyyy-MM-dd');
        const defaultValues = { date: defaultDate, buildingId: '', notes: '' };
        
        if (collectionToEdit) {
            setActiveTab(collectionToEdit.type);
            const editDefaults = {
                buildingId: collectionToEdit.buildingId,
                date: toInputDate(collectionToEdit.date),
                notes: collectionToEdit.notes || '',
            };
            if(collectionToEdit.type === 'cash') {
                cashForm.reset({
                    ...editDefaults,
                    d500: collectionToEdit.denominations?.d500 || 0,
                    d200: collectionToEdit.denominations?.d200 || 0,
                    d100: collectionToEdit.denominations?.d100 || 0,
                    d50: collectionToEdit.denominations?.d50 || 0,
                    d20: collectionToEdit.denominations?.d20 || 0,
                    d10: collectionToEdit.denominations?.d10 || 0,
                    d5: collectionToEdit.denominations?.d5 || 0,
                    d2: collectionToEdit.denominations?.d2 || 0,
                    d1: collectionToEdit.denominations?.d1 || 0,
                });
                onlineForm.reset(defaultValues);
            } else {
                 onlineForm.reset({
                    ...editDefaults,
                    amount: collectionToEdit.totalAmount,
                    paymentMode: collectionToEdit.paymentMode || '',
                    transactionId: collectionToEdit.transactionId || '',
                });
                cashForm.reset(defaultValues);
            }
        } else {
            cashForm.reset(defaultValues);
            onlineForm.reset(defaultValues);
            setActiveTab('cash');
        }
    }
  }, [isOpen, collectionToEdit, cashForm, onlineForm]);


  const cashDenominationValues = cashForm.watch();
  const totalCashAmount = useMemo(() => {
    return denominations.reduce((acc, den) => {
      const key = `d${den}` as keyof CashFormValues;
      const count = Number(cashDenominationValues[key] || 0);
      return acc + den * count;
    }, 0);
  }, [cashDenominationValues]);


  const onCashSubmit: SubmitHandler<CashFormValues> = async (data) => {
    if (!firestore || !auth?.currentUser) return;
    
    if (totalCashAmount <= 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Total amount must be greater than zero.' });
        return;
    }

    const collectionData = {
      buildingId: data.buildingId,
      collectedBy: auth.currentUser.uid,
      date: Timestamp.fromDate(parseISO(data.date)),
      totalAmount: totalCashAmount,
      denominations: {
        d500: data.d500 || 0,
        d200: data.d200 || 0,
        d100: data.d100 || 0,
        d50: data.d50 || 0,
        d20: data.d20 || 0,
        d10: data.d10 || 0,
        d5: data.d5 || 0,
        d2: data.d2 || 0,
        d1: data.d1 || 0,
      },
      notes: data.notes || '',
      type: 'cash' as const,
    };

    if(isEditing && collectionToEdit) {
        updateDocumentNonBlocking(doc(firestore, 'cashCollections', collectionToEdit.id), collectionData);
         createLog(firestore, auth, {
          action: 'updated',
          entityType: 'Cash Collection',
          entityId: collectionToEdit.id,
          description: `Updated cash collection of ${formatCurrency(totalCashAmount)}`,
        });
        toast({ title: 'Success!', description: 'Cash collection updated successfully.' });
    } else {
        const collectionRef = collection(firestore, 'cashCollections');
        const docRef = await addDocumentNonBlocking(collectionRef, {...collectionData, createdAt: serverTimestamp()});
        if (docRef) {
            createLog(firestore, auth, {
            action: 'created',
            entityType: 'Cash Collection',
            entityId: docRef.id,
            description: `Logged cash collection of ${formatCurrency(totalCashAmount)}`,
            });
        }
        toast({ title: 'Success!', description: 'Cash collection recorded successfully.' });
    }
    setIsOpen(false);
  };
  
  const onOnlineSubmit: SubmitHandler<OnlineFormValues> = async (data) => {
    if (!firestore || !auth?.currentUser) return;

    const collectionData = {
      buildingId: data.buildingId,
      collectedBy: auth.currentUser.uid,
      date: Timestamp.fromDate(parseISO(data.date)),
      totalAmount: data.amount,
      paymentMode: data.paymentMode,
      transactionId: data.transactionId,
      notes: data.notes || '',
      type: 'online' as const,
    };
    
    if(isEditing && collectionToEdit) {
        updateDocumentNonBlocking(doc(firestore, 'cashCollections', collectionToEdit.id), collectionData);
        createLog(firestore, auth, {
            action: 'updated',
            entityType: 'Cash Collection',
            entityId: collectionToEdit.id,
            description: `Updated online transaction of ${formatCurrency(data.amount)}`,
        });
        toast({ title: "Success!", description: "Online transaction updated successfully." });
    } else {
        const collectionRef = collection(firestore, 'cashCollections');
        const docRef = await addDocumentNonBlocking(collectionRef, {...collectionData, createdAt: serverTimestamp()});
        if (docRef) {
            createLog(firestore, auth, {
                action: 'created',
                entityType: 'Cash Collection',
                entityId: docRef.id,
                description: `Logged online transaction of ${formatCurrency(data.amount)}`,
            });
        }
        toast({ title: "Success!", description: "Online transaction recorded successfully." });
    }
    setIsOpen(false);
  };
  
   const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Collection' : 'New Collection'}</DialogTitle>
            <DialogDescription>
                Log a cash collection by denomination or a single online transaction.
            </DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cash" disabled={isEditing && activeTab !== 'cash'}>Cash Denominations</TabsTrigger>
            <TabsTrigger value="online" disabled={isEditing && activeTab !== 'online'}>Online Transaction</TabsTrigger>
        </TabsList>
        <TabsContent value="cash">
            <form onSubmit={cashForm.handleSubmit(onCashSubmit)}>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="cashBuildingId">Building</Label>
                            <Controller
                                name="buildingId"
                                control={cashForm.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a building" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {buildings?.map((building) => (
                                            <SelectItem key={building.id} value={building.id}>
                                                {building.buildingName}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {cashForm.formState.errors.buildingId && <p className="text-sm text-destructive">{cashForm.formState.errors.buildingId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cashDate">Date</Label>
                            <Input type="date" {...cashForm.register('date')} />
                        </div>
                    </div>

                <div className="space-y-4">
                    <Label>Denominations</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {denominations.map((den) => (
                        <div key={den} className="space-y-1">
                        <Label htmlFor={`d${den}`} className="text-sm">{formatCurrency(den)}</Label>
                        <Input
                            id={`d${den}`}
                            type="number"
                            placeholder="Count"
                            {...cashForm.register(`d${den}`)}
                        />
                        </div>
                    ))}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="cashNotes">Notes (Optional)</Label>
                    <Textarea id="cashNotes" {...cashForm.register('notes')} placeholder="Any extra details..." />
                </div>
                </div>
                <DialogFooter className="flex-col sm:flex-row sm:justify-between items-center pt-4">
                    <div className="text-xl font-bold">
                        Total: {formatCurrency(totalCashAmount)}
                    </div>
                <div className="flex gap-2">
                 <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={cashForm.formState.isSubmitting}>
                    {cashForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'Save Changes' : 'Save Collection'}
                  </Button>
                </div>
                </DialogFooter>
            </form>
        </TabsContent>
        <TabsContent value="online">
            <form onSubmit={onlineForm.handleSubmit(onOnlineSubmit)}>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="onlineBuildingId">Building</Label>
                            <Controller
                                name="buildingId"
                                control={onlineForm.control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a building" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {buildings?.map((building) => (
                                            <SelectItem key={building.id} value={building.id}>
                                                {building.buildingName}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {onlineForm.formState.errors.buildingId && <p className="text-sm text-destructive">{onlineForm.formState.errors.buildingId.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="onlineDate">Date</Label>
                            <Input type="date" {...onlineForm.register('date')} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Amount</Label>
                            <Input id="amount" type="number" {...onlineForm.register('amount')} />
                            {onlineForm.formState.errors.amount && <p className="text-sm text-destructive">{onlineForm.formState.errors.amount.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="paymentMode">Payment Mode</Label>
                            <Input id="paymentMode" {...onlineForm.register('paymentMode')} placeholder="e.g. UPI, NEFT" />
                            {onlineForm.formState.errors.paymentMode && <p className="text-sm text-destructive">{onlineForm.formState.errors.paymentMode.message}</p>}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="transactionId">Transaction ID / Reference</Label>
                        <Input id="transactionId" {...onlineForm.register('transactionId')} />
                        {onlineForm.formState.errors.transactionId && <p className="text-sm text-destructive">{onlineForm.formState.errors.transactionId.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="onlineNotes">Notes (Optional)</Label>
                        <Textarea id="onlineNotes" {...onlineForm.register('notes')} placeholder="Any extra details..." />
                </div>
                </div>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={onlineForm.formState.isSubmitting}>
                        {onlineForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {isEditing ? 'Save Changes' : 'Save Transaction'}
                    </Button>
                </DialogFooter>
            </form>
        </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
