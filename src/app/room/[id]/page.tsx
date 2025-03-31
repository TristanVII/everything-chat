'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/room/Header';
import VideoGrid from '@/components/room/VideoGrid';
import SidebarTabs, { TabType } from '@/components/room/SidebarTabs';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string; // Type assertion, consider adding validation
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [uptime, setUptime] = useState("00:00"); // When first load the page, get the room state, which includes the current uptime in ms.
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  // Simulate asking for permissions
  useEffect(() => {
    // In a real app, you'd use navigator.mediaDevices.getUserMedia here
    // and update state based on success/failure.
    const timer = setTimeout(() => {
      // Simulate granting permissions after a short delay
      console.log("Permissions granted (simulated).");
      setPermissionsGranted(true);
    }, 1500); // Simulate a 1.5 second permission prompt

    return () => clearTimeout(timer);
  }, []);

  // Placeholder for uptime calculation
  useEffect(() => {
    if (!permissionsGranted) return;

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
      const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
      setUptime(`${minutes}:${seconds}`);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [permissionsGranted]);

  if (!permissionsGranted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-x-bg text-x-text-primary">
        <div className="text-center p-8 bg-x-card rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Permissions Required</h2>
          <p className="mb-6 text-x-text-secondary">Please allow access to your camera and microphone to join the room.</p>
          {/* In a real app, a button here might trigger the actual permission request */}
          <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-x-accent border-t-transparent"></div>
          <p className="mt-4 text-sm text-x-text-secondary">Waiting for permissions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#202124] text-white">
      <Header 
        roomId={roomId} 
        uptime={uptime} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="flex flex-1 overflow-hidden">
        <VideoGrid />
        <SidebarTabs activeTab={activeTab} />
      </div>
    </div>
  );
} 