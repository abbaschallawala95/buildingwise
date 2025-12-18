import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { transactions, members } from "@/lib/data"

export default function RecentActivity() {
  const recentTransactions = transactions.slice(0, 5);

  const getMemberName = (memberId: string) => {
    return members.find(m => m.id === memberId)?.name || 'N/A';
  }
  
  const getInitials = (name: string) => {
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
          {recentTransactions.map((transaction) => (
            <div className="flex items-center" key={transaction.id}>
              <Avatar className="h-9 w-9">
                <AvatarImage src="/avatars/01.png" alt="Avatar" />
                <AvatarFallback>{getInitials(getMemberName(transaction.memberId))}</AvatarFallback>
              </Avatar>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium leading-none">{getMemberName(transaction.memberId)}</p>
                <p className="text-sm text-muted-foreground">{transaction.title} for {transaction.month}</p>
              </div>
              <div className="ml-auto font-medium">{formatCurrency(transaction.amount)}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
