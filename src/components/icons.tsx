import { Building2 } from 'lucide-react';

export const Logo = ({ className }: { className?: string }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <Building2 className="h-6 w-6 text-primary" />
    <span className="text-lg font-bold text-foreground">BuildingWise</span>
  </div>
);
