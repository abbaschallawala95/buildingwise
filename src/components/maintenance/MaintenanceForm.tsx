'use client';

import { useState, useMemo } from "react";
import { useForm, type SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, serverTimestamp, doc, collectionGroup, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase, useAuth } from '@/firebase';
import { format, parse, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { generatePersonalizedReceiptMessage } from "@/ai/flows/generate-personalized-receipt-message";
import { Loader2, Wand2, Download } from "lucide-react";
import type { Building } from "@/app/(app)/buildings/page";
import type { Member } from "@/app/(app)/members/page";
import type { Transaction } from "@/app/(app)/transactions/page";
import { downloadReceipt } from "@/lib/receipt-pdf";
import { createLog } from "@/lib/logger";

const maintenanceSchema = z.object({
  buildingId: z.string().min(1, "Please select a building."),
  memberId: z.string().min(1, "Please select a member."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  paymentDate: z.string().min(1, "Date is required."), // YYYY-MM-DD format
  paymentMode: z.enum(["Cash", "Online", "Cheque"]),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

type ReceiptData = Omit<Transaction, 'month' | 'paymentDate'> & { month: string, paymentDate: any }; // month is string

export function MaintenanceForm() {
  const firestore = useFirestore();
  const auth = useAuth();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
    control,
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
    }
  });

  const buildingId = watch("buildingId");

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  const { data: allBuildings, isLoading: loadingBuildings } = useCollection<Building>(buildingsCollection);
  
  const membersInBuildingCollection = useMemoFirebase(
    () => (firestore && buildingId ? collection(firestore, 'buildings', buildingId, 'members') : null),
    [firestore, buildingId]
  );
  const { data: membersInBuilding, isLoading: loadingMembers } = useCollection<Member>(membersInBuildingCollection);

  const allMembersCollection = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'members') : null),
    [firestore]
  );
  const { data: allMembers } = useCollection<Member>(allMembersCollection);


  const onSubmit: SubmitHandler<MaintenanceFormValues> = async (data) => {
    if (!firestore) return;
    
    const paymentDate = parseISO(data.paymentDate);
    const formattedMonth = format(paymentDate, 'MMMM yyyy');
    
    const receiptNumber = `R-${new Date().getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`;
    
    const transactionData = {
      buildingId: data.buildingId,
      memberId: data.memberId,
      amount: data.amount,
      paymentMode: data.paymentMode,
      month: formattedMonth,
      paymentDate: Timestamp.fromDate(paymentDate),
      type: 'maintenance' as const,
      title: 'Monthly Maintenance',
      receiptNumber: receiptNumber,
      createdAt: serverTimestamp(),
    };

    const collectionRef = collection(firestore, 'buildings', data.buildingId, 'transactions');
    try {
      const docRef = await addDocumentNonBlocking(collectionRef, transactionData);
      if (docRef) {
          const member = allMembers?.find(m => m.id === data.memberId);
          createLog(firestore, auth, {
            action: 'created',
            entityType: 'Transaction',
            entityId: docRef.id,
            description: `Recorded maintenance for ${member?.fullName || 'N/A'} of ${data.amount}`,
          });
          setReceiptData({ ...transactionData, id: docRef.id, paymentDate: paymentDate });
      }
      toast({
        title: "Success!",
        description: "Maintenance payment recorded successfully.",
      });
      reset();
      setValue("paymentDate", format(new Date(), 'yyyy-MM-dd'));
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not record payment. Please try again.",
      });
    }
  };
  
  const handleDownload = () => {
    if (!receiptData) return;
    const member = allMembers?.find(m => m.id === receiptData.memberId);
    const building = allBuildings?.find(b => b.id === receiptData.buildingId);

    if (!member || !building) {
      toast({
        variant: "destructive",
        title: 'Error',
        description: 'Could not find member or building details to generate PDF.',
      });
      return;
    }

    downloadReceipt({
      transaction: receiptData,
      member: member,
      buildingName: building.buildingName,
      toast: toast,
    });
  }


  const handleGenerateMessage = async () => {
    if (!receiptData) return;
    
    const building = allBuildings?.find(b => b.id === receiptData.buildingId);
    const member = allMembers?.find(m => m.id === receiptData.memberId);

    if (!member || !building) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not generate message, missing details."
        });
        return;
    }

    setIsGenerating(true);
    setGeneratedMessage("");
    try {
      const result = await generatePersonalizedReceiptMessage({
        buildingName: building.buildingName,
        memberName: member.fullName,
        flatNumber: member.flatNumber,
        amount: receiptData.amount,
        month: receiptData.month,
        receiptNumber: receiptData.receiptNumber,
        paymentMode: receiptData.paymentMode,
      });

      if (result.message) {
        setGeneratedMessage(result.message);
      } else {
        throw new Error("Failed to generate message.");
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not generate AI message. Please try again.",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (receiptData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Receipt & Notification</CardTitle>
          <CardDescription>Payment recorded successfully. Receipt No: {receiptData.receiptNumber}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
           <div>
             <h3 className="font-semibold">Download Receipt</h3>
             <p className="text-sm text-muted-foreground">Download a PDF copy of the receipt.</p>
             <Button onClick={handleDownload} className="mt-2">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
             </Button>
           </div>

            <Separator />
           
          <div>
            <h3 className="font-semibold">Send WhatsApp Notification</h3>
            <p className="text-sm text-muted-foreground">Generate a personalized message to send to the member.</p>
            
            {generatedMessage && (
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                rows={6}
                className="bg-muted mt-2"
              />
            )}
            
            <Button onClick={handleGenerateMessage} disabled={isGenerating} className="mt-2">
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  {generatedMessage ? 'Regenerate with AI' : 'Generate with AI'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={() => setReceiptData(null)}>
            Record Another Payment
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Record Payment</CardTitle>
        <CardDescription>
          Fill in the details to record a maintenance payment.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="buildingId">Building</Label>
            <Controller
              name="buildingId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => {
                    field.onChange(value);
                    setValue("memberId", "");
                  }}
                  value={field.value}
                  disabled={loadingBuildings}
                >
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
            {errors.buildingId && <p className="text-sm text-destructive">{errors.buildingId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberId">Member</Label>
            <Controller
              name="memberId"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={!buildingId || loadingMembers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingMembers ? "Loading..." : "Select a member"} />
                  </SelectTrigger>
                  <SelectContent>
                    {membersInBuilding?.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.fullName} - {member.flatNumber}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.memberId && <p className="text-sm text-destructive">{errors.memberId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" {...register("amount")} placeholder="e.g. 2500" />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Payment Date</Label>
               <Input type="date" {...register('paymentDate')} />
              {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode</Label>
             <Controller
                name="paymentMode"
                control={control}
                defaultValue="Online"
                render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Online">Online</SelectItem>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Cheque">Cheque</SelectItem>
                      </SelectContent>
                    </Select>
                )}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Record Payment
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
