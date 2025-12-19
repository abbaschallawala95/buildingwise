'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MemberForm } from '@/components/members/MemberForm';
import { FilePenLine } from 'lucide-react';
import type { Member } from '@/app/(app)/members/page';
import type { Building } from '@/app/(app)/buildings/page';

interface EditMemberProps {
    member: Member;
    buildings: Building[];
}

export function EditMember({ member, buildings }: EditMemberProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                <FilePenLine className="h-4 w-4" />
                <span className="sr-only">Edit Member</span>
            </Button>
            {isOpen && (
                <MemberForm
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    member={member}
                    buildings={buildings}
                />
            )}
        </>
    );
}
