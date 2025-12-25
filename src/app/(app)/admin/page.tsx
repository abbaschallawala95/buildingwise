'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useDoc } from '@/firebase/firestore/use-doc';

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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '../profile/page';
import { MoreHorizontal, PlusCircle } from 'lucide-react';
import { UserForm } from '@/components/admin/UserForm';

export default function AdminPage() {
  const firestore = useFirestore();
  const { user: currentUser } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | undefined>(undefined);


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
  
  useEffect(() => {
    // This effect handles the authorization logic.
    // It will only run when the loading state or the user profile data changes.
    
    // If we are still waiting for the user's profile to load, do nothing.
    if (isLoadingCurrentUser) {
      return;
    }

    // After loading, if the user profile exists and the role is 'admin', grant access.
    if (currentUserProfile && currentUserProfile.role === 'admin') {
      setIsAuthorized(true);
    } else {
      // If the profile doesn't exist, or the role is not 'admin', redirect.
      // This also handles the case where a non-admin user tries to access the page.
      router.replace('/dashboard');
    }
  }, [isLoadingCurrentUser, currentUserProfile, router]);


  const isLoading = isLoadingUsers || isLoadingCurrentUser;

  const handleAddUser = () => {
    setSelectedUser(undefined);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleStatusChange = (user: UserProfile, newStatus: boolean) => {
    if (!firestore || !currentUserProfile) return;

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
  
  if (!isAuthorized) {
    return (
        <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-4">
            <div className="text-center">
                <h2 className="text-xl font-semibold">Verifying Authorization...</h2>
                <p className="text-muted-foreground">Please wait while we check your permissions.</p>
            </div>
        </div>
    );
  }

  return (
    <>
      <PageHeader title="User Management">
         <Button size="sm" className="gap-1" onClick={handleAddUser}>
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add User
          </span>
        </Button>
      </PageHeader>
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
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
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-4 w-[150px]" /></div></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-[80px]" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-9 w-[50px] ml-auto" /></TableCell>
                  </TableRow>
                ))}
              {error && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-destructive">
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
                    <TableCell>
                       <Switch
                        checked={user.status === 'active'}
                        onCheckedChange={(checked) => handleStatusChange(user, checked)}
                        disabled={user.email === 'abbas@example.com'}
                        aria-label={`Activate or deactivate ${user.fullName}`}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem>
                           <DropdownMenuItem className="text-destructive" disabled>Delete User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && !error && sortedUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <UserForm
        isOpen={isFormOpen}
        setIsOpen={setIsFormOpen}
        userToEdit={selectedUser}
      />
    </>
  );
}
