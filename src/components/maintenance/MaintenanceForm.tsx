"use client";

import { useState } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

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
import { members, buildings } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { generatePersonalizedReceiptMessage } from "@/ai/flows/generate-personalized-receipt-message";
import { Loader2, Wand2 } from "lucide-react";

const maintenanceSchema = z.object({
  buildingId: z.string().min(1, "Please select a building."),
  memberId: z.string().min(1, "Please select a member."),
  amount: z.coerce.number().min(1, "Amount must be greater than 0."),
  month: z.string().min(1, "Month is required."),
  paymentMode: z.enum(["Cash", "Online", "Cheque"]),
});

type MaintenanceFormValues = z.infer<typeof maintenanceSchema>;

type ReceiptData = MaintenanceFormValues & { receiptNumber: string };

export function MaintenanceForm() {
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceSchema),
  });

  const buildingId = watch("buildingId");

  const onSubmit: SubmitHandler<MaintenanceFormValues> = (data) => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      const receiptNumber = `R-${new Date().getFullYear()}${Math.floor(Math.random() * 9000) + 1000}`;
      setReceiptData({ ...data, receiptNumber });
      toast({
        title: "Success!",
        description: "Maintenance payment recorded successfully.",
      });
      setIsSubmitting(false);
    }, 1000);
  };

  const handleGenerateMessage = async () => {
    if (!receiptData) return;
    setIsGenerating(true);
    setGeneratedMessage("");
    try {
      const memberName = members.find(m => m.id === receiptData.memberId)?.name || "Member";
      const buildingName = buildings.find(b => b.id === receiptData.buildingId)?.name || "Building";
      const flatNumber = members.find(m => m.id === receiptData.memberId)?.flatNumber || "";
      
      const result = await generatePersonalizedReceiptMessage({
        buildingName,
        memberName,
        flatNumber,
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
                readOnly
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
                  Generate with AI
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
              setSelectedBuilding(value);
              setValue("memberId", "");
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a building" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((building) => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.buildingId && <p className="text-sm text-destructive">{errors.buildingId.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="memberId">Member</Label>
            <Select onValueChange={(value) => setValue("memberId", value)} disabled={!buildingId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a member" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter((member) => member.buildingId === buildingId)
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.flatNumber}
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
