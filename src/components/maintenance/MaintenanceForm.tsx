'use client';

import { useState, useMemo } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useFirestore, useCollection, addDocumentNonBlocking, useMemoFirebase } from '@/firebase';

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
import { Loader2, Wand2 } from "lucide-react";
import type { Building } from "@/app/(app)/buildings/page";
import type { Member } from "@/app/(app)/members/page";
import type { Transaction } from "@/app/(app)/transactions/page";

const maintenanceSchema = z.object({
  buildingId: z.string().min(1, "Please select a building."),
  memberId: z.string().min(1, "Please select a member."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  month: z.string().min(3, "Month is required e.g. July 2024."),
  paymentMode: z.enum(["Cash", "Online", "Cheque"]),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

type ReceiptData = Transaction;

export function MaintenanceForm() {
  const firestore = useFirestore();
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
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
  });

  const buildingId = watch("buildingId");

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  const { data: buildings, isLoading: loadingBuildings } = useCollection<Building>(buildingsCollection);
  
  const membersInBuildingCollection = useMemoFirebase(
    () => (firestore && buildingId ? collection(firestore, 'buildings', buildingId, 'members') : null),
    [firestore, buildingId]
  );
  const { data: members, isLoading: loadingMembers } = useCollection<Member>(membersInBuildingCollection);

  const onSubmit: SubmitHandler<MaintenanceFormValues> = async (data) => {
    if (!firestore) return;
    
    const receiptNumber = `R-${new Date().getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`;
    const transactionData = {
      ...data,
      id: '', // will be set by firestore
      type: 'maintenance' as const,
      title: 'Monthly Maintenance',
      receiptNumber: receiptNumber,
      createdAt: serverTimestamp(),
    };

    const collectionRef = collection(firestore, 'buildings', data.buildingId, 'transactions');
    try {
      const docRef = await addDocumentNonBlocking(collectionRef, transactionData);
      setReceiptData({ ...transactionData, id: docRef ? docRef.id : '' });
      toast({
        title: "Success!",
        description: "Maintenance payment recorded successfully.",
      });
      reset();
    } catch (error) {
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not record payment. Please try again.",
      });
    }
  };

  const handleGenerateMessage = async () => {
    if (!receiptData || !buildings || !members) return;
    setIsGenerating(true);
    setGeneratedMessage("");
    try {
      const member = members.find(m => m.id === receiptData.memberId);
      const building = buildings.find(b => b.id === receiptData.buildingId);
      
      const result = await generatePersonalizedReceiptMessage({
        buildingName: building?.buildingName || "Your Building",
        memberName: member?.fullName || "Valued Member",
        flatNumber: member?.flatNumber || "",
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
        <CardContent className="space-y-4">
          <Button>Download PDF Receipt</Button>
          <Separator />
          <div className="space-y-2">
            <h3 className="font-semibold">Send WhatsApp Notification</h3>
            <p className="text-sm text-muted-foreground">Generate a personalized message to send to the member.</p>
            
            {generatedMessage && (
              <Textarea
                value={generatedMessage}
                onChange={(e) => setGeneratedMessage(e.target.value)}
                rows={6}
                className="bg-muted"
              />
            )}
            
            <Button onClick={handleGenerateMessage} disabled={isGenerating}>
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
            <Select onValueChange={(value) => {
              setValue("buildingId", value);
              setValue("memberId", "");
            }} disabled={loadingBuildings}>
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
            {errors.buildingId && <p className="text-sm text-destructive">{errors.buildingId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberId">Member</Label>
            <Select onValueChange={(value) => setValue("memberId", value)} disabled={!buildingId || loadingMembers}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members
                  ?.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.fullName} - {member.flatNumber}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.memberId && <p className="text-sm text-destructive">{errors.memberId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" {...register("amount")} placeholder="e.g. 2500" />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="month">For Month</Label>
              <Input id="month" {...register("month")} placeholder="e.g. July 2024" />
              {errors.month && <p className="text-sm text-destructive">{errors.month.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMode">Payment Mode</Label>
            <Select defaultValue="Online" onValueChange={(value: "Cash" | "Online" | "Cheque") => setValue("paymentMode", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Online">Online</SelectItem>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
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
