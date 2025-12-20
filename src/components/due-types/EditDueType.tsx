'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DueTypeForm } from '@/components/due-types/DueTypeForm';
import { FilePenLine } from 'lucide-react';
import type { DueType } from '@/app/(app)/due-types/page';

interface EditDueTypeProps {
  dueType: DueType;
}

export function EditDueType({ dueType }: EditDueTypeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <FilePenLine className="h-4 w-4" />
        <span className="sr-only">Edit Due Type</span>
      </Button>
      {isOpen && (
        <DueTypeForm
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          dueType={dueType}
        />
      )}
    </>
  );
}
