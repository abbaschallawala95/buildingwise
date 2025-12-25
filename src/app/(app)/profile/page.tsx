
'use client';

import { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  updateProfile,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import Image from 'next/image';

import { useUser, useFirestore, useAuth, useFirebaseApp, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserCircle2 } from 'lucide-react';

// Validation Schemas
const profileSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters.'),
  email: z.string().email('Please enter a valid email address.'),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters.'),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

export default function ProfilePage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const firebaseApp = useFirebaseApp();
  const { toast } = useToast();

  const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Profile Info Form
  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
  });

  // Password Change Form
  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPassword,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });
  
  useEffect(() => {
    if (user) {
      resetProfile({
        fullName: user.displayName || '',
        email: user.email || '',
      });
      setProfilePicturePreview(user.photoURL);
    }
  }, [user, resetProfile]);
  
  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfilePictureFile(file);
      setProfilePicturePreview(URL.createObjectURL(file));
    }
  };

  const handleProfileUpdate: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user || !firestore) return;
    
    setIsUploading(true);
    let photoURL = user.photoURL;

    try {
        // 1. Upload new profile picture if selected
        if (profilePictureFile) {
            const storage = getStorage(firebaseApp);
            const storageRef = ref(storage, `profile-pictures/${user.uid}`);
            const snapshot = await uploadBytes(storageRef, profilePictureFile);
            photoURL = await getDownloadURL(snapshot.ref);
        }

        // 2. Update Firebase Auth profile
        await updateProfile(user, {
            displayName: data.fullName,
            photoURL: photoURL,
        });

        // 3. Update Firestore profile document
        const userDocRef = doc(firestore, 'users', user.uid);
        updateDocumentNonBlocking(userDocRef, {
            fullName: data.fullName,
            photoURL: photoURL,
        });
        
        // 4. Update email if it has changed (requires reauthentication)
        if (data.email !== user.email) {
            // This is a sensitive operation and Firebase requires recent re-authentication.
            // For this version, we will just show a toast message.
            toast({
                title: "Email Change Requires Re-authentication",
                description: "Updating your email is not supported in this version.",
                variant: "destructive"
            });
        }

        toast({
            title: 'Success',
            description: 'Your profile has been updated successfully.',
        });
        setProfilePictureFile(null);

    } catch (error: any) {
        console.error("Profile update error:", error);
        toast({
            variant: 'destructive',
            title: 'Update Failed',
            description: error.message || 'An error occurred while updating your profile.',
        });
    } finally {
        setIsUploading(false);
    }
  };

  const handlePasswordUpdate: SubmitHandler<PasswordFormValues> = async (data) => {
      if (!user || !user.email) return;

      try {
        // Re-authenticate the user first
        const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
        await reauthenticateWithCredential(user, credential);

        // If re-authentication is successful, update the password
        await updatePassword(user, data.newPassword);

        toast({
            title: "Success",
            description: "Your password has been changed successfully."
        });
        resetPassword();
      } catch (error: any) {
          console.error("Password update error:", error);
          let description = "An error occurred. Please try again.";
          if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
              description = "The current password you entered is incorrect.";
          }
           toast({
            variant: "destructive",
            title: "Password Change Failed",
            description: description,
        });
      }
  };
  
  if (isUserLoading) {
      return (
          <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )
  }

  return (
    <>
      <PageHeader title="My Profile" />
      <div className="grid gap-6 md:grid-cols-5">
        <div className="md:col-span-3">
             <Card>
                <form onSubmit={handleSubmitProfile(handleProfileUpdate)}>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal details.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                             <Label>Profile Picture</Label>
                             <div className="flex items-center gap-4">
                                {profilePicturePreview ? (
                                    <Image src={profilePicturePreview} alt="Profile preview" width={80} height={80} className="rounded-full object-cover h-20 w-20" />
                                ) : (
                                    <UserCircle2 className="h-20 w-20 text-muted-foreground" />
                                )}
                                <Input id="picture" type="file" accept="image/*" onChange={handlePictureChange} className="max-w-xs"/>
                             </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Full Name</Label>
                            <Input id="fullName" {...registerProfile('fullName')} />
                            {profileErrors.fullName && <p className="text-sm text-destructive">{profileErrors.fullName.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" {...registerProfile('email')} />
                            {profileErrors.email && <p className="text-sm text-destructive">{profileErrors.email.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmittingProfile || isUploading}>
                            {(isSubmittingProfile || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
        <div className="md:col-span-2">
             <Card>
                <form onSubmit={handleSubmitPassword(handlePasswordUpdate)}>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your login password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="currentPassword">Current Password</Label>
                            <Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />
                             {passwordErrors.currentPassword && <p className="text-sm text-destructive">{passwordErrors.currentPassword.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
                            {passwordErrors.newPassword && <p className="text-sm text-destructive">{passwordErrors.newPassword.message}</p>}
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />
                            {passwordErrors.confirmPassword && <p className="text-sm text-destructive">{passwordErrors.confirmPassword.message}</p>}
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSubmittingPassword}>
                            {isSubmittingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
      </div>
    </>
  );
}

    