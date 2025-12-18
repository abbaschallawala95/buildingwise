"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { transactions, expenses } from '@/lib/data';

const getMonthShortName = (month: string) => month.substring(0, 3);

const monthlyData = Array.from({ length: 12 }, (_, i) => {
  const monthName = new Date(0, i).toLocaleString('default', { month: 'long' });
  const income = transactions
    .filter(t => t.month.startsWith(monthName))
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = expenses
    .filter(e => new Date(e.date).getMonth() === i)
    .reduce((sum, e) => sum + e.amount, 0);
  
  return {
    name: getMonthShortName(monthName),
    income: Math.round(income),
    expense: Math.round(expense),
  };
});


export default function OverviewChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>Monthly income vs. expenses.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
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
      </CardContent>
    </Card>
  )
}
