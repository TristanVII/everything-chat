'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/room/Header';
import VideoGrid from '@/components/room/VideoGrid';
import SidebarTabs, { TabType } from '@/components/room/SidebarTabs';
import { WebRTCService } from '@/lib/webrtcService';

export default function RoomPage() { 
  const params = useParams();
  const roomId = params.id as string;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [uptime, setUptime] = useState("00:00");
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);

  

  useEffect(() => {
    let webrtcService: WebRTCService | null = null;
    
    async function initialize() {
      try {
        webrtcService = new WebRTCService(roomId);
        setWebrtcService(webrtcService);
        const stream = await webrtcService.localStream;
        setLocalStream(stream);
      } catch (error) {
        console.error(error);
        setLocalStream(null);
      }
    }
    
    initialize();
    
    // Cleanup function
    return () => {
      if (webrtcService) {
        // Close the WebSocket connection
        webrtcService.signalingChannel.ws.close();
      }
    };
  }, [roomId]);


  if (!localStream) {
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

  const allStreams = { 'local': localStream };
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