import { PageHeader } from '@/components/PageHeader';
import StatCards from '@/components/dashboard/StatCards';
import OverviewChart from '@/components/dashboard/OverviewChart';
import RecentActivity from '@/components/dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard">
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </PageHeader>
      <div className="space-y-6">
        <StatCards />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-4">
            <OverviewChart />
          </div>
          <div className="lg:col-span-3">
            <RecentActivity />
          </div>
        </div>
      </div>
    </>
  );
}
