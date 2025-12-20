import jsPDF from 'jspdf';
import type { Transaction } from '@/app/(app)/transactions/page';
import type { Member } from '@/app/(app)/members/page';
import type { useToast } from '@/hooks/use-toast';

interface DownloadReceiptProps {
    transaction: Transaction;
    member: Member;
    buildingName: string;
    toast: ReturnType<typeof useToast>['toast'];
}

const formatDate = (date: any) => {
    if (!date) return 'N/A';
    // Handle Firestore Timestamp or standard JS Date object
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString();
};

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);

export function downloadReceipt({ transaction: tx, member, buildingName, toast }: DownloadReceiptProps) {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(22);
    doc.text(buildingName, 105, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text('Maintenance Receipt', 105, 30, { align: 'center' });
    doc.line(15, 35, 195, 35);

    // Details
    doc.setFontSize(12);
    doc.text(`Receipt No: ${tx.receiptNumber}`, 15, 45);
    doc.text(`Payment Date: ${formatDate(tx.paymentDate)}`, 195, 45, { align: 'right' });

    doc.line(15, 50, 195, 50);

    doc.text(`Received from:`, 15, 60);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${member.fullName} (Flat: ${member.flatNumber})`, 20, 68);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`the sum of:`, 15, 80);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(tx.amount), 20, 88);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`for the payment of:`, 15, 100);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${tx.title} for ${tx.month}`, 20, 108);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Payment Mode:`, 15, 120);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(tx.paymentMode, 20, 128);

    // Footer
    doc.line(15, 260, 195, 260);
    doc.setFontSize(10);
    doc.text('This is a computer-generated receipt and does not require a signature.', 105, 265, { align: 'center' });
    
    doc.save(`Receipt-${tx.receiptNumber}.pdf`);

    toast({
        title: 'Receipt Downloading',
        description: `Your PDF receipt for #${tx.receiptNumber} is being downloaded.`,
    });
}

    