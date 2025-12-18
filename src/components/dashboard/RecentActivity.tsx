'use client';

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Transaction } from "@/app/(app)/transactions/page"
import type { Member } from "@/app/(app)/members/page"
import { Skeleton } from "../ui/skeleton";
import { useMemo } from "react";

interface RecentActivityProps {
  transactions: Transaction[];
  members: Member[];
  isLoading: boolean;
}

export default function RecentActivity({ transactions, members, isLoading }: RecentActivityProps) {

  const recentTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => {
      // Ensure createdAt exists and has seconds property
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return bTime - aTime;
    }).slice(0, 5);
  }, [transactions]);

  const memberMap = useMemo(() => {
    if (!members) return new Map();
    return new Map(members.map(m => [m.id, m]));
  }, [members]);

  const getMemberName = (memberId: string) => {
    return memberMap.get(memberId)?.fullName || 'N/A';
  }
  
  const getInitials = (name: string) => {
    if (!name || name === 'N/A') return '??';
    return name.split(' ').map(n => n[0]).join('');
  }

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          A log of the most recent transactions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {isLoading && (
            Array.from({ length: 5 }).map((_, i) => (
              <div className="flex items-center" key={i}>
                <Skeleton className="h-9 w-9 rounded-full" />
                <div className="ml-4 space-y-2">
                  <Skeleton className="h-4 w-[150px]" />
                  <Skeleton className="h-3 w-[100px]" />
                </div>
                <Skeleton className="ml-auto h-5 w-[60px]" />
              </div>
            ))
          )}
          {!isLoading && recentTransactions.map((transaction) => (
            <div className="flex items-center" key={transaction.id}>
              <Avatar className="h-9 w-9">
                <AvatarFallback>{getInitials(getMemberName(transaction.memberId))}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{getMemberName(transaction.memberId)}</p>
                <p className="text-sm text-muted-foreground">{transaction.title} for {transaction.month}</p>
              </div>
              <div className="ml-auto font-medium">{formatCurrency(transaction.amount)}</div>
            </div>
          ))}
          {!isLoading && recentTransactions.length === 0 && (
            <p className="text-sm text-muted-foreground text-center">No recent transactions.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
