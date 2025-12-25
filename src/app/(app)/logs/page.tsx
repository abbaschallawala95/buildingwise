'use client';

import React, { useState, useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile } from 'firebase/auth';

export type Log = {
  id: string;
  userId: string;
  userFullName: string;
  action: 'created' | 'updated' | 'deleted';
  entityType: string;
  entityId: string;
  description: string;
  timestamp: any; // Firestore Timestamp
};

export default function LogsPage() {
  const firestore = useFirestore();
  const [userFilter, setUserFilter] = useState('all');

  const logsCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'logs') : null),
    [firestore]
  );
  
  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );

  const {
    data: logs,
    isLoading: isLoadingLogs,
    error,
  } = useCollection<Log>(logsCollection);

  const { data: users, isLoading: isLoadingUsers } = useCollection<UserProfile>(usersCollection);

  const isLoading = isLoadingLogs || isLoadingUsers;
  
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('');
  };

  const sortedAndFilteredLogs = useMemo(() => {
    if (!logs) return [];
    let filteredLogs = logs;
    if (userFilter !== 'all') {
      filteredLogs = logs.filter(log => log.userId === userFilter);
    }
    return [...filteredLogs].sort((a, b) => {
      const aDate = a.timestamp?.seconds || 0;
      const bDate = b.timestamp?.seconds || 0;
      return bDate - aDate;
    });
  }, [logs, userFilter]);
  
  const formatDate = (date: any) => {
    if (!date) return 'N/A';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleString();
    }
    return new Date(date).toLocaleString();
  };

  const getActionBadgeVariant = (action: Log['action']) => {
    switch (action) {
      case 'created':
        return 'secondary';
      case 'updated':
        return 'default';
      case 'deleted':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <>
      <PageHeader title="Audit Logs" />
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Activity History</CardTitle>
              <CardDescription>
                A log of all create, update, and delete actions in the app.
              </CardDescription>
            </div>
            <div className="w-[200px]">
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users?.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[300px]" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-destructive">
                    Error loading logs: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedAndFilteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.timestamp)}</TableCell>
                    <TableCell className="flex items-center gap-2">
                       <Avatar className="h-8 w-8">
                         <AvatarFallback>{getInitials(log.userFullName)}</AvatarFallback>
                       </Avatar>
                       {log.userFullName}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)} className="capitalize">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{log.description}</TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedAndFilteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                    No activity logs found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
