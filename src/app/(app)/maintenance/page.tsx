'use client';

import { PageHeader } from "@/components/PageHeader";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";

interface MaintenancePageProps {
  isUserAdmin?: boolean;
}

export default function MaintenancePage({ isUserAdmin }: MaintenancePageProps) {
  return (
    <>
      <PageHeader title="Maintenance Collection" />
      <MaintenanceForm isUserAdmin={isUserAdmin} />
    </>
  );
}
