'use client';

import React, { useState, useMemo } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';

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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '../profile/page';
import { useDoc } from '@/firebase/firestore/use-doc';

export default function AdminPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const usersCollection = useMemoFirebase(
    () => (firestore ? collection(firestore, 'users') : null),
    [firestore]
  );
  
  const currentUserProfileDoc = useMemoFirebase(
    () => (firestore && currentUser ? doc(firestore, 'users', currentUser.uid) : null),
    [firestore, currentUser]
  );

  const {
    data: users,
    isLoading: isLoadingUsers,
    error,
  } = useCollection<UserProfile>(usersCollection);

  const { data: currentUserProfile, isLoading: isLoadingCurrentUser } = useDoc<UserProfile>(currentUserProfileDoc);
  
  // Redirect if the current user is not an admin
  if (!isLoadingCurrentUser && currentUserProfile?.role !== 'admin') {
      router.replace('/dashboard');
      return (
        <div className="flex justify-center items-center h-full">
            <p>You are not authorized to view this page.</p>
        </div>
      );
  }

  const isLoading = isLoadingUsers || isLoadingCurrentUser;

  const handleStatusChange = (user: UserProfile, newStatus: boolean) => {
    if (!firestore || !currentUserProfile) return;

    // Super admin cannot be deactivated
    if (user.email === 'abbas@example.com') {
      toast({
        variant: 'destructive',
        title: 'Action Forbidden',
        description: 'The super admin account cannot be deactivated.',
      });
      return;
    }

    const userDocRef = doc(firestore, 'users', user.id);
    const status = newStatus ? 'active' : 'inactive';

    updateDocumentNonBlocking(userDocRef, { status });

    toast({
      title: 'User Updated',
      description: `${user.fullName}'s status has been set to ${status}.`,
    });
  };
  
  const getInitials = (name: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('');
  };

  const sortedUsers = useMemo(() => {
    if (!users) return [];
    return [...users].sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
  }, [users]);
  
  return (
    <>
      <PageHeader title="Admin Panel" />
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            Manage user roles and access to the application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-6 w-12 ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-destructive">
                    Error loading users: {error.message}
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                !error &&
                sortedUsers.map((user) => (
                  <TableRow key={user.id}>
                     <TableCell className="font-medium flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                        </Avatar>
                        {user.fullName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                     <TableCell>
                      <Badge variant={user.status === 'active' ? 'secondary' : 'destructive'} className="capitalize">
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Switch
                        checked={user.status === 'active'}
                        onCheckedChange={(checked) => handleStatusChange(user, checked)}
                        disabled={user.email === 'abbas@example.com'}
                        aria-label={`Activate or deactivate ${user.fullName}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found.
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
