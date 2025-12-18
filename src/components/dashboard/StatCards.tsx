'use client';

import { DollarSign, Users, CreditCard, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Member } from '@/app/(app)/members/page';
import type { Transaction } from '@/app/(app)/transactions/page';
import type { Expense } from '@/app/(app)/expenses/page';
import { Skeleton } from '../ui/skeleton';

const StatCard = ({ title, value, icon: Icon, change, changeType, isLoading }: { title: string; value: string; icon: React.ElementType; change?: string, changeType?: 'increase' | 'decrease', isLoading?: boolean }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="mt-2 h-3 w-1/2" />
        </>
      ) : (
        <>
          <div className="text-2xl font-bold">{value}</div>
          {change && (
            <p className={`text-xs text-muted-foreground ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
              {change} from last month
            </p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

interface StatCardsProps {
  members: Member[];
  transactions: Transaction[];
  expenses: Expense[];
  isLoading: boolean;
}

export default function StatCards({ members, transactions, expenses, isLoading }: StatCardsProps) {
  const totalMembers = members.length;
  const totalMaintenance = transactions
    .filter(t => t.type === 'maintenance')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExtraCollections = transactions
    .filter(t => t.type === 'extra_collection')
    .reduce((acc, t) => acc + t.amount, 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
  const netBalance = totalMaintenance + totalExtraCollections - totalExpenses;
  const pendingDues = members.reduce((acc, m) => acc + (m.previousDues || 0), 0);

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard title="Net Balance" value={formatCurrency(netBalance)} icon={Landmark} change="+5.2%" changeType="increase" isLoading={isLoading} />
      <StatCard title="Total Maintenance" value={formatCurrency(totalMaintenance)} icon={DollarSign} change="+12.1%" changeType="increase" isLoading={isLoading} />
      <StatCard title="Total Expenses" value={formatCurrency(totalExpenses)} icon={CreditCard} change="-3.4%" changeType="decrease" isLoading={isLoading} />
      <StatCard title="Extra Collections" value={formatCurrency(totalExtraCollections)} icon={TrendingUp} isLoading={isLoading} />
      <StatCard title="Pending Dues" value={formatCurrency(pendingDues)} icon={TrendingDown} isLoading={isLoading} />
      <StatCard title="Total Members" value={`+${totalMembers}`} icon={Users} isLoading={isLoading} />
    </div>
  );
}
