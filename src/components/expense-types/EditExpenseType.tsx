'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExpenseTypeForm } from '@/components/expense-types/ExpenseTypeForm';
import { FilePenLine } from 'lucide-react';
import type { ExpenseType } from '@/app/(app)/expense-types/page';

interface EditExpenseTypeProps {
  expenseType: ExpenseType;
}

export function EditExpenseType({ expenseType }: EditExpenseTypeProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
        <FilePenLine className="h-4 w-4" />
        <span className="sr-only">Edit Expense Type</span>
      </Button>
      {isOpen && (
        <ExpenseTypeForm
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          expenseType={expenseType}
        />
      )}
    </>
  );
}
