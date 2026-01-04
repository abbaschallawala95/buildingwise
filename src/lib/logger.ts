
'use client';

import { collection, serverTimestamp, Firestore } from "firebase/firestore";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Auth } from "firebase/auth";

type Action = "created" | "updated" | "deleted";
type EntityType = "Building" | "Member" | "Transaction" | "Expense" | "Due" | "Extra Collection" | "Expense Type" | "Due Type" | "User" | "Cash Collection";

interface LogPayload {
    action: Action;
    entityType: EntityType;
    entityId: string;
    description: string;
}

export const createLog = (firestore: Firestore | null, auth: Auth | null, payload: LogPayload) => {
    if (!firestore || !auth?.currentUser) {
        console.error("Firestore or user not available for logging.");
        return;
    }

    const logData = {
        userId: auth.currentUser.uid,
        userFullName: auth.currentUser.displayName || "Unknown User",
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId,
        description: payload.description,
        timestamp: serverTimestamp(),
    };

    const logsCollection = collection(firestore, 'logs');
    addDocumentNonBlocking(logsCollection, logData);
};
