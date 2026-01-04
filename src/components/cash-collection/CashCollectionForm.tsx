'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase, useAuth } from '@/firebase';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Building } from '@/app/(app)/buildings/page';
import { createLog } from '@/lib/logger';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const denominations = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const cashCollectionSchema = z.object({
  buildingId: z.string().min(1, 'Please select a building.'),
  date: z.date(),
  notes: z.string().optional(),
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

const onlineTransactionSchema = z.object({
    buildingId: z.string().min(1, 'Please select a building.'),
    date: z.date(),
    amount: z.coerce.number().min(1, "Amount must be greater than 0."),
    paymentMode: z.string().min(1, "Payment mode is required."),
    transactionId: z.string().min(1, "Transaction ID is required."),
    notes: z.string().optional(),
});


type CashCollectionFormValues = z.infer<typeof cashCollectionSchema>;
type OnlineTransactionFormValues = z.infer<typeof onlineTransactionSchema>;


export function CashCollectionForm() {
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const buildingsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'buildings') : null), [firestore]);
  const { data: allBuildings, isLoading: loadingBuildings } = useCollection<Building>(buildingsCollection);

  const cashForm = useForm<CashCollectionFormValues>({
    resolver: zodResolver(cashCollectionSchema),
    defaultValues: { date: new Date() },
  });

  const onlineForm = useForm<OnlineTransactionFormValues>({
    resolver: zodResolver(onlineTransactionSchema),
    defaultValues: { date: new Date() },
  });

  const cashDenominationValues = cashForm.watch();
  const totalCashAmount = useMemo(() => {
    return denominations.reduce((acc, den) => {
      const key = `d${den}` as keyof CashCollectionFormValues;
      const count = cashDenominationValues[key] || 0;
      // Ensure count is treated as a number
      return acc + den * (Number(count) || 0);
    }, 0);
  }, [cashDenominationValues]);


  const onCashSubmit: SubmitHandler<CashCollectionFormValues> = async (data) => {
    if (!firestore || !auth?.currentUser) return;
    
    if (totalCashAmount <= 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Total amount must be greater than zero.' });
        return;
    }

    const collectionData = {
      buildingId: data.buildingId,
      collectedBy: auth.currentUser.uid,
      date: Timestamp.fromDate(data.date),
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
      createdAt: serverTimestamp(),
    };

    const collectionRef = collection(firestore, 'cashCollections');
    try {
      const docRef = await addDocumentNonBlocking(collectionRef, collectionData);
      if (docRef) {
        createLog(firestore, auth, {
          action: 'created',
          entityType: 'Cash Collection',
          entityId: docRef.id,
          description: `Logged cash collection of ${formatCurrency(totalCashAmount)}`,
        });
      }
      toast({ title: 'Success!', description: 'Cash collection recorded successfully.' });
      cashForm.reset({ 
          date: new Date(), 
          buildingId: data.buildingId,
          notes: '',
          d500: undefined, d200: undefined, d100: undefined, d50: undefined, d20: undefined, d10: undefined, d5: undefined, d2: undefined, d1: undefined 
      });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not record collection.' });
    }
  };
  
  const onOnlineSubmit: SubmitHandler<OnlineTransactionFormValues> = async (data) => {
    if (!firestore || !auth?.currentUser) return;

    const collectionData = {
      buildingId: data.buildingId,
      collectedBy: auth.currentUser.uid,
      date: Timestamp.fromDate(data.date),
      totalAmount: data.amount,
      paymentMode: data.paymentMode,
      transactionId: data.transactionId,
      notes: data.notes || '',
      type: 'online' as const,
      createdAt: serverTimestamp(),
    };
    
    const collectionRef = collection(firestore, 'cashCollections');
    try {
        const docRef = await addDocumentNonBlocking(collectionRef, collectionData);
        if (docRef) {
            createLog(firestore, auth, {
                action: 'created',
                entityType: 'Cash Collection',
                entityId: docRef.id,
                description: `Logged online transaction of ${formatCurrency(data.amount)}`,
            });
        }
        toast({ title: "Success!", description: "Online transaction recorded successfully." });
        onlineForm.reset({ 
            date: new Date(),
            buildingId: data.buildingId,
            amount: undefined,
            paymentMode: '',
            transactionId: '',
            notes: ''
        });
    } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Could not record transaction." });
    }
  };
  
   const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);


  return (
    <Tabs defaultValue="cash" className="max-w-4xl mx-auto">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="cash">Cash Denominations</TabsTrigger>
        <TabsTrigger value="online">Online Transaction</TabsTrigger>
      </TabsList>
      <TabsContent value="cash">
        <Card>
          <CardHeader>
            <CardTitle>Cash Collection</CardTitle>
            <CardDescription>Enter the count for each cash denomination received.</CardDescription>
          </CardHeader>
          <form onSubmit={cashForm.handleSubmit(onCashSubmit)}>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="cashBuildingId">Building</Label>
                        <Controller
                        name="buildingId"
                        control={cashForm.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={loadingBuildings}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a building" />
                            </SelectTrigger>
                            <SelectContent>
                                {allBuildings?.map((building) => (
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
                        <Controller
                            name="date"
                            control={cashForm.control}
                            render={({ field }) => <Input type="date" value={field.value.toISOString().split('T')[0]} onChange={e => field.onChange(new Date(e.target.value))} />}
                        />
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
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="text-xl font-bold">
                    Total: {formatCurrency(totalCashAmount)}
                </div>
              <Button type="submit" disabled={cashForm.formState.isSubmitting}>
                {cashForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Cash Collection
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
      <TabsContent value="online">
         <Card>
          <CardHeader>
            <CardTitle>Online Transaction</CardTitle>
            <CardDescription>Log a single online payment received.</CardDescription>
          </CardHeader>
          <form onSubmit={onlineForm.handleSubmit(onOnlineSubmit)}>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="onlineBuildingId">Building</Label>
                        <Controller
                        name="buildingId"
                        control={onlineForm.control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={loadingBuildings}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a building" />
                            </SelectTrigger>
                            <SelectContent>
                                {allBuildings?.map((building) => (
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
                        <Controller
                            name="date"
                            control={onlineForm.control}
                            render={({ field }) => <Input type="date" value={field.value.toISOString().split('T')[0]} onChange={e => field.onChange(new Date(e.target.value))} />}
                        />
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
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={onlineForm.formState.isSubmitting}>
                {onlineForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Online Transaction
              </Button>
            </CardFooter>
          </form>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
