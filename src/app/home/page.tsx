"use client";

import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import HomeHeader from '@/components/shared/HomeHeader';

export default function HomePage() {
  const router = useRouter();

  const handleLaunchChat = () => {
    const roomId = uuidv4();
    router.push(`/room/${roomId}`);
  };

  return (
    <div className="flex min-h-screen flex-col bg-x-bg text-x-text-primary">
      <HomeHeader />
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="mb-8 text-4xl font-bold">Welcome to X-Chat</h1>
          <button
            onClick={handleLaunchChat}
            className="rounded-full bg-[#000000] px-8 py-3 text-lg font-semibold text-white transition-colors cursor-pointer"
          >
            Launch chat room
          </button>
        </div>
      </div>
    </div>
  );
} 