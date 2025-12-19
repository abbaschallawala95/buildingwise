'use client';

import { PageHeader } from '@/components/PageHeader';
import StatCards from '@/components/dashboard/StatCards';
import OverviewChart from '@/components/dashboard/OverviewChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import type { Building } from '../buildings/page';
import type { Member } from '../members/page';
import type { Expense } from '../expenses/page';
import type { Transaction } from '../transactions/page';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const buildingsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'buildings') : null),
    [firestore]
  );
  const membersCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'members') : null),
    [firestore]
  );
  const transactionsCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'transactions') : null),
    [firestore]
  );
  const expensesCollectionGroup = useMemoFirebase(
    () => (firestore ? collectionGroup(firestore, 'expenses') : null),
    [firestore]
  );

  const { data: buildings, isLoading: loadingBuildings } = useCollection<Building>(buildingsCollection);
  const { data: members, isLoading: loadingMembers } = useCollection<Member>(membersCollectionGroup);
  const { data: transactions, isLoading: loadingTransactions } = useCollection<Transaction>(transactionsCollectionGroup);
  const { data: expenses, isLoading: loadingExpenses } = useCollection<Expense>(expensesCollectionGroup);

  const isLoading = loadingBuildings || loadingMembers || loadingTransactions || loadingExpenses;

  const handleDownloadReport = () => {
    if (isLoading || !buildings || !members || !transactions || !expenses) {
      toast({
        variant: "destructive",
        title: "Cannot Download Report",
        description: "Data is still loading. Please wait a moment and try again."
      });
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Building Sheet
      const buildingsData = buildings.map(b => ({
        "Building Name": b.buildingName,
        "Address": b.address,
        "Opening Balance": b.openingBalance || 0,
      }));
      const wsBuildings = XLSX.utils.json_to_sheet(buildingsData);
      XLSX.utils.book_append_sheet(wb, wsBuildings, "Buildings");

      // Members Sheet
      const buildingMap = new Map(buildings.map(b => [b.id, b.buildingName]));
      const membersData = members.map(m => ({
        "Full Name": m.fullName,
        "Building": buildingMap.get(m.buildingId) || "N/A",
        "Flat Number": m.flatNumber,
        "Floor": m.floor,
        "Contact Number": m.contactNumber,
        "Monthly Maintenance": m.monthlyMaintenance,
        "Opening Dues": m.previousDues,
        "Maintenance Start Date": m.maintenanceStartDate?.toDate ? m.maintenanceStartDate.toDate().toLocaleDateString() : 'N/A',
        "Due Day": m.monthlyDueDate,
      }));
      const wsMembers = XLSX.utils.json_to_sheet(membersData);
      XLSX.utils.book_append_sheet(wb, wsMembers, "Members");

      // Transactions Sheet
      const memberMap = new Map(members.map(m => [m.id, `${m.fullName} (${m.flatNumber})`]));
      const transactionsData = transactions.map(t => ({
        "Date": t.createdAt?.toDate ? t.createdAt.toDate().toLocaleString() : 'N/A',
        "Receipt Number": t.receiptNumber,
        "Member": memberMap.get(t.memberId) || "N/A",
        "Building": buildingMap.get(t.buildingId) || "N/A",
        "Type": t.type,
        "Details": t.title,
        "Month": t.month,
        "Amount": t.amount,
        "Payment Mode": t.paymentMode,
      }));
      const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(wb, wsTransactions, "Transactions");
      
      // Expenses Sheet
      const expensesData = expenses.map(e => ({
        "Expense Date": e.expenseDate?.toDate ? e.expenseDate.toDate().toLocaleDateString() : 'N/A',
        "Building": buildingMap.get(e.buildingId) || "N/A",
        "Category": e.expenseType,
        "Description": e.description,
        "Amount": e.amount,
      }));
      const wsExpenses = XLSX.utils.json_to_sheet(expensesData);
      XLSX.utils.book_append_sheet(wb, wsExpenses, "Expenses");

      // Download the workbook
      XLSX.writeFile(wb, "BuildingWise_Report.xlsx");

      toast({
        title: "Report Generated",
        description: "Your Excel report is being downloaded.",
      });

    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        variant: "destructive",
        title: "Report Generation Failed",
        description: "An unexpected error occurred while creating the report.",
      });
    }
  };


  return (
    <>
      <PageHeader title="Dashboard">
        <Button onClick={handleDownloadReport} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </PageHeader>
      <div className="space-y-6">
        <StatCards
          buildings={buildings || []}
          members={members || []}
          transactions={transactions || []}
          expenses={expenses || []}
          isLoading={isLoading}
        />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <OverviewChart
              transactions={transactions || []}
              expenses={expenses || []}
              isLoading={isLoading}
            />
          </div>
          <div className="lg:col-span-3">
            <RecentActivity
              transactions={transactions || []}
              members={members || []}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
