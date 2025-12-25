'use client';

import { useState, useMemo } from 'react';
import { collection, collectionGroup } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import type { Building } from '../buildings/page';
import type { Member } from '../members/page';
import type { Transaction } from '../transactions/page';
import type { Expense } from '../expenses/page';
import type { Due } from '../dues/page';

export default function ReportsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const [buildingFilter, setBuildingFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');

  // Data Fetching
  const buildingsCollection = useMemoFirebase(() => (firestore ? collection(firestore, 'buildings') : null), [firestore]);
  const membersCollection = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'members') : null), [firestore]);
  const transactionsCollection = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'transactions') : null), [firestore]);
  const expensesCollection = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'expenses') : null), [firestore]);
  const duesCollection = useMemoFirebase(() => (firestore ? collectionGroup(firestore, 'dues') : null), [firestore]);

  const { data: buildings, isLoading: loadingBuildings } = useCollection<Building>(buildingsCollection);
  const { data: members, isLoading: loadingMembers } = useCollection<Member>(membersCollection);
  const { data: transactions, isLoading: loadingTransactions } = useCollection<Transaction>(transactionsCollection);
  const { data: expenses, isLoading: loadingExpenses } = useCollection<Expense>(expensesCollection);
  const { data: dues, isLoading: loadingDues } = useCollection<Due>(duesCollection);

  const isLoading = loadingBuildings || loadingMembers || loadingTransactions || loadingExpenses || loadingDues;

  // Memoized Maps for efficient lookups
  const buildingMap = useMemo(() => new Map(buildings?.map(b => [b.id, b.buildingName])), [buildings]);
  const memberMap = useMemo(() => new Map(members?.map(m => [m.id, m])), [members]);

  // Data Filtering
  const filteredData = useMemo(() => {
    let filteredTransactions = transactions || [];
    let filteredExpenses = expenses || [];
    let filteredDues = dues || [];

    if (buildingFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.buildingId === buildingFilter);
      filteredExpenses = filteredExpenses.filter(e => e.buildingId === buildingFilter);
      filteredDues = filteredDues.filter(d => d.buildingId === buildingFilter);
    }

    if (monthFilter !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => t.month === monthFilter);
      filteredExpenses = filteredExpenses.filter(e => {
        const expenseMonth = e.expenseDate?.toDate ? new Date(e.expenseDate.toDate()).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
        return expenseMonth === monthFilter;
      });
      filteredDues = filteredDues.filter(d => {
        const dueMonth = d.dueDate?.toDate ? new Date(d.dueDate.toDate()).toLocaleString('default', { month: 'long', year: 'numeric' }) : '';
        return dueMonth === monthFilter;
      });
    }

    return {
      transactions: filteredTransactions,
      expenses: filteredExpenses,
      dues: filteredDues,
    };
  }, [transactions, expenses, dues, buildingFilter, monthFilter]);


  const summary = useMemo(() => {
    const totalIncome = filteredData.transactions.reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = filteredData.expenses.reduce((acc, e) => acc + e.amount, 0);
    const netBalance = totalIncome - totalExpenses;
    return { totalIncome, totalExpenses, netBalance };
  }, [filteredData]);
  
  const allMonths = useMemo(() => {
    const months = new Set<string>();
    transactions?.forEach(t => t.month && months.add(t.month));
    expenses?.forEach(e => {
      if (e.expenseDate?.toDate) {
        months.add(new Date(e.expenseDate.toDate()).toLocaleString('default', { month: 'long', year: 'numeric' }));
      }
    });
    return Array.from(months);
  }, [transactions, expenses]);


  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);
  const formatDate = (date: any) => date?.toDate ? date.toDate().toLocaleDateString() : 'N/A';

  const handleDownloadReport = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Summary Sheet
      const summaryData = [
        { Category: 'Total Income', Amount: summary.totalIncome },
        { Category: 'Total Expenses', Amount: summary.totalExpenses },
        { Category: 'Net Balance', Amount: summary.netBalance },
      ];
      const wsSummary = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
      
      // Transactions Sheet
      const transactionsData = filteredData.transactions.map(t => ({
        'Date': formatDate(t.createdAt),
        'Receipt': t.receiptNumber,
        'Member': memberMap.get(t.memberId)?.fullName || 'N/A',
        'Building': buildingMap.get(t.buildingId) || 'N/A',
        'Type': t.type,
        'Details': t.title,
        'Month': t.month,
        'Amount': t.amount,
        'Payment Mode': t.paymentMode,
      }));
      const wsTransactions = XLSX.utils.json_to_sheet(transactionsData);
      XLSX.utils.book_append_sheet(wb, wsTransactions, 'All Transactions');

      // Dues Sheet
      const duesData = filteredData.dues.map(d => ({
        'Due Date': formatDate(d.dueDate),
        'Payment Date': d.status === 'paid' ? formatDate(d.paymentDate) : 'N/A',
        'Member': memberMap.get(d.memberId)?.fullName || 'N/A',
        'Building': buildingMap.get(d.buildingId) || 'N/A',
        'Type': d.type,
        'Title': d.title,
        'Status': d.status,
        'Amount': d.amount,
      }));
      const wsDues = XLSX.utils.json_to_sheet(duesData);
      XLSX.utils.book_append_sheet(wb, wsDues, 'Dues');

      XLSX.writeFile(wb, `BuildingWise_Report_${buildingFilter}_${monthFilter}.xlsx`);
      toast({ title: 'Report Downloaded', description: 'Your Excel report has been generated successfully.' });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: 'Download Failed', description: 'Could not generate the Excel report.' });
    }
  };

  return (
    <>
      <PageHeader title="Reports">
        <Button onClick={handleDownloadReport} disabled={isLoading}>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </PageHeader>

      <Card>
        <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div>
                    <CardTitle>Financial Reports</CardTitle>
                    <CardDescription>View and export financial data.</CardDescription>
                </div>
                <div className="flex gap-2">
                    <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Building" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Buildings</SelectItem>
                            {buildings?.map(b => <SelectItem key={b.id} value={b.id}>{b.buildingName}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Select value={monthFilter} onValueChange={setMonthFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by Month" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Months</SelectItem>
                            {allMonths.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardHeader>
        <CardContent>
            <Tabs defaultValue="summary">
                <TabsList>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                    <TabsTrigger value="transactions">All Transactions</TabsTrigger>
                    <TabsTrigger value="dues">Dues</TabsTrigger>
                </TabsList>
                <TabsContent value="summary" className="pt-4">
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card>
                            <CardHeader><CardTitle>Total Income</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-3/4"/> : formatCurrency(summary.totalIncome)}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Total Expenses</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-3/4"/> : formatCurrency(summary.totalExpenses)}</div></CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Net Balance</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold">{isLoading ? <Skeleton className="h-8 w-3/4"/> : formatCurrency(summary.netBalance)}</div></CardContent>
                        </Card>
                    </div>
                </TabsContent>
                <TabsContent value="transactions" className="pt-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Building</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && filteredData.transactions.map(t => (
                                <TableRow key={t.id}>
                                    <TableCell>{formatDate(t.createdAt)}</TableCell>
                                    <TableCell>{buildingMap.get(t.buildingId)}</TableCell>
                                    <TableCell>{memberMap.get(t.memberId)?.fullName}</TableCell>
                                    <TableCell>{t.title}</TableCell>
                                    <TableCell><Badge variant={t.type === 'maintenance' ? 'secondary' : 'default'} className="capitalize">{t.type.replace('_', ' ')}</Badge></TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(t.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
                <TabsContent value="dues" className="pt-4">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Member</TableHead>
                                <TableHead>Building</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                             {isLoading && Array.from({length: 3}).map((_, i) => (
                                <TableRow key={i}>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="text-right"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                                </TableRow>
                            ))}
                            {!isLoading && filteredData.dues.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>{formatDate(d.dueDate)}</TableCell>
                                    <TableCell>{memberMap.get(d.memberId)?.fullName}</TableCell>
                                    <TableCell>{buildingMap.get(d.buildingId)}</TableCell>
                                    <TableCell>{d.title}</TableCell>
                                    <TableCell><Badge variant={d.status === 'paid' ? 'secondary' : 'destructive'} className="capitalize">{d.status}</Badge></TableCell>
                                    <TableCell className="text-right font-medium">{formatCurrency(d.amount)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
