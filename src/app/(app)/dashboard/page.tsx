'use client';

import { PageHeader } from '@/components/PageHeader';
import StatCards from '@/components/dashboard/StatCards';
import OverviewChart from '@/components/dashboard/OverviewChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, collectionGroup } from 'firebase/firestore';
import type { Building } from '../buildings/page';
import type { Member } from '../members/page';
import type { Expense } from '../expenses/page';
import type { Transaction } from '../transactions/page';

export default function DashboardPage() {
  const firestore = useFirestore();

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

  return (
    <>
      <PageHeader title="Dashboard">
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </PageHeader>
      <div className="space-y-6">
        <StatCards
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
