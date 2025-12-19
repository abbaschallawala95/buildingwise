'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BuildingForm } from '@/components/buildings/BuildingForm';
import { FilePenLine } from 'lucide-react';
import type { Building } from '@/app/(app)/buildings/page';

interface EditBuildingProps {
    building: Building;
}

export function EditBuilding({ building }: EditBuildingProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
                <FilePenLine className="h-4 w-4" />
                <span className="sr-only">Edit Building</span>
            </Button>
            {isOpen && (
                <BuildingForm
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    building={building}
                />
            )}
        </>
    );
}
