'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/room/Header';
import VideoGrid from '@/components/room/VideoGrid';
import SidebarTabs, { TabType } from '@/components/room/SidebarTabs';
import { RemoteStreamsState, SignalingMessage, useWebRTC } from '@/hooks/useWebRTC';
import { SignalingServer } from '@/lib/signalingServer';

function initializeSignalingChannel(roomId: string) {
  const ws = new WebSocket(`ws://localhost:8080/ws?roomId=${roomId}`); // Replace with your Go server WS endpoint
  const signalingChannel = new SignalingServer(ws, roomId);
  return signalingChannel;
}

export default function RoomPage() { 
  const params = useParams();
  const roomId = params.id as string;
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const [uptime, setUptime] = useState("00:00");
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [signalingChannel, setSignalingChannel] = useState<any>(null); // State for signaling channel instance

  // Initialize signaling channel when roomId is available
  useEffect(() => {
      if (roomId) {
          const channel = initializeSignalingChannel(roomId);
          setSignalingChannel(channel);

          // Cleanup signaling channel on component unmount or roomId change
          return () => {
              console.log("Cleaning up signaling channel connection.");
              channel.disconnect();
              setSignalingChannel(null);
          };
      }
  }, [roomId]);
  
  
  const { localStream, remoteStreams, initializeMedia } = useWebRTC(roomId, signalingChannel);

  // Use the WebRTC hook, passing the signaling channel instance

  // Request permissions after component mounts
  useEffect(() => {
    async function getMedia() {
      const granted = await initializeMedia();
      setPermissionsGranted(granted);
    }
    getMedia();
    // No cleanup needed here as useWebRTC handles stream cleanup
  }, [initializeMedia]); // Rerun if initializeMedia changes (it shouldn't due to useCallback)

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

  // Combine local and remote streams for the VideoGrid
  const allStreams = { ...remoteStreams };
  if (localStream) {
     // Assign a special key or use your actual peerId for the local stream
    allStreams['local'] = localStream;
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
        <VideoGrid streams={allStreams} />
        <SidebarTabs activeTab={activeTab} />
      </div>
    </div>
  );
} 