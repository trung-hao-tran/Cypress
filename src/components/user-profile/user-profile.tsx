import React from 'react';
import CustomDialogTrigger from '../global/custom-dialog-trigger';
import UserProfileForm from './user-profile-form';

interface UserProfileProps {
  children: React.ReactNode;
}

const UserProfile: React.FC<UserProfileProps> = ({ children }) => {
  return (
    <CustomDialogTrigger
      header="My Account"
      content={<UserProfileForm />}
    >
      {children}
    </CustomDialogTrigger>
  );
};

export default UserProfile;
