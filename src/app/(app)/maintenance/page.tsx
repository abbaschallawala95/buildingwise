import { PageHeader } from "@/components/PageHeader";
import { MaintenanceForm } from "@/components/maintenance/MaintenanceForm";

export default function MaintenancePage() {
  return (
    <>
      <PageHeader title="Maintenance Collection" />
      <MaintenanceForm />
    </>
  );
}
