'use server';

/**
 * @fileOverview Generates a personalized WhatsApp message for sending receipts to members.
 *
 * - generatePersonalizedReceiptMessage - A function that generates the personalized receipt message.
 * - GeneratePersonalizedReceiptMessageInput - The input type for the generatePersonalizedReceiptMessage function.
 * - GeneratePersonalizedReceiptMessageOutput - The return type for the generatePersonalizedReceiptMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedReceiptMessageInputSchema = z.object({
  buildingName: z.string().describe('The name of the building.'),
  memberName: z.string().describe('The name of the member.'),
  flatNumber: z.string().describe('The flat number of the member.'),
  amount: z.number().describe('The amount paid.'),
  month: z.string().describe('The month for which the payment was made.'),
  receiptNumber: z.string().describe('The receipt number.'),
  paymentMode: z.string().describe('The payment mode used.'),
});
export type GeneratePersonalizedReceiptMessageInput = z.infer<typeof GeneratePersonalizedReceiptMessageInputSchema>;

const GeneratePersonalizedReceiptMessageOutputSchema = z.object({
  message: z.string().describe('The personalized WhatsApp message.'),
});
export type GeneratePersonalizedReceiptMessageOutput = z.infer<typeof GeneratePersonalizedReceiptMessageOutputSchema>;

export async function generatePersonalizedReceiptMessage(input: GeneratePersonalizedReceiptMessageInput): Promise<GeneratePersonalizedReceiptMessageOutput> {
  return generatePersonalizedReceiptMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedReceiptMessagePrompt',
  input: {schema: GeneratePersonalizedReceiptMessageInputSchema},
  output: {schema: GeneratePersonalizedReceiptMessageOutputSchema},
  prompt: `You are an expert at writing personalized WhatsApp messages for building maintenance receipts.

  Given the following information, generate a personalized and friendly WhatsApp message to be sent to the member.

  Building Name: {{{buildingName}}}
  Member Name: {{{memberName}}}
  Flat Number: {{{flatNumber}}}
  Amount Paid: {{{amount}}}
  Month: {{{month}}}
  Receipt Number: {{{receiptNumber}}}
  Payment Mode: {{{paymentMode}}}

  The message should:
  - Be concise and to the point.
  - Thank the member for their payment.
  - Include all the relevant details like amount, month, and receipt number.
  - Be friendly and professional.
  - Use a tone that is appropriate for communication via WhatsApp.

  Example:
  Dear [Member Name],
  Thank you for your maintenance payment of [Amount] for the month of [Month]. Receipt number is [Receipt Number].
  Thanks,
  [Building Name] Management
  `,
});

const generatePersonalizedReceiptMessageFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedReceiptMessageFlow',
    inputSchema: GeneratePersonalizedReceiptMessageInputSchema,
    outputSchema: GeneratePersonalizedReceiptMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
