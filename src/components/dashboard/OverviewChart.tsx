'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { Transaction } from '@/app/(app)/transactions/page';
import type { Expense } from '@/app/(app)/expenses/page';
import { Skeleton } from "../ui/skeleton";

interface OverviewChartProps {
  transactions: Transaction[];
  expenses: Expense[];
  isLoading: boolean;
}

const getMonthShortName = (monthIndex: number) => new Date(0, monthIndex).toLocaleString('default', { month: 'short' });

export default function OverviewChart({ transactions, expenses, isLoading }: OverviewChartProps) {
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
    const income = transactions
      .filter(t => t.month && t.month.startsWith(monthName))
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = expenses
      .filter(e => e.expenseDate && new Date(e.expenseDate).getMonth() === i)
      .reduce((sum, e) => sum + e.amount, 0);
    
    return {
      name: getMonthShortName(i),
      income: Math.round(income),
      expense: Math.round(expense),
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Monthly income vs. expenses.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {isLoading ? (
          <div className="w-full h-[350px] flex items-center justify-center">
            <Skeleton className="w-full h-full" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={monthlyData}>
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₹${Number(value) / 1000}k`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted))' }}
                contentStyle={{ 
                  background: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 'var(--radius)'
                }}
              />
              <Legend wrapperStyle={{fontSize: "12px"}}/>
              <Bar dataKey="income" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Income"/>
              <Bar dataKey="expense" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="Expense"/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
