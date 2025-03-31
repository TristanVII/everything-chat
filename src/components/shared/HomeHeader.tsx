'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { FaXTwitter } from 'react-icons/fa6';

// TODO: Replace with actual user data and profile picture URL

const HomeHeader = () => {
  const { data: session } = useSession();
  console.log("session", session);
  const user = session?.user;
  return (
    <header className="flex items-center justify-between p-4 bg-x-bg border-b border-x-border">
      {/* Logo */}
      <FaXTwitter className="h-8 w-8 cursor-pointer" />

      {/* Profile Picture Link */}
      <Link href="/settings">
        <Image
          src={user?.image || '/path/to/default-profile.png'}
          alt="User Profile"
          loading="lazy"
          width={40}
          height={40}
          className="rounded-full cursor-pointer"
        />
      </Link>
    </header>
  );
};

export default HomeHeader; 