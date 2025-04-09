'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/room/Header';
import VideoGrid from '@/components/room/VideoGrid';
import SidebarTabs, { TabType } from '@/components/room/SidebarTabs';
import { WebRTCService } from '@/lib/webrtcService';

export default function RoomPage() { 
  const params = useParams();
  const roomId = params.id as string;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [uptime, setUptime] = useState("00:00");
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);

  const handleRemoteStreamAdded = useCallback((peerId: string, stream: MediaStream) => {
    console.log(`RoomPage: Adding remote stream for peer ${peerId}`);
    setRemoteStreams(prev => new Map(prev).set(peerId, stream));
  }, []);

  const handleRemoteStreamRemoved = useCallback((peerId: string) => {
    console.log(`RoomPage: Removing remote stream for peer ${peerId}`);
    setRemoteStreams(prev => {
      const newMap = new Map(prev);
      newMap.delete(peerId);
      return newMap;
    });
  }, []);

  useEffect(() => {
    let serviceInstance: WebRTCService | null = null;
    
    async function initialize() {
      console.log('Initializing WebRTC service...');
      try {
        serviceInstance = new WebRTCService(
          roomId,
          handleRemoteStreamAdded,
          handleRemoteStreamRemoved
        );
        (window as any).webrtcServiceInstance = serviceInstance;

        setWebrtcService(serviceInstance);
        const stream = await serviceInstance.localStream;
        console.log('Local stream obtained:', stream);
        setLocalStream(stream);
      } catch (error) {
        console.error('Failed to initialize WebRTC service:', error);
        setLocalStream(null);
      }
    }
    
    initialize();
    
    return () => {
      console.log('Cleaning up RoomPage...');
      if (serviceInstance) {
        console.log('Closing WebSocket connection...');
        serviceInstance.signalingChannel.ws.close();
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          console.log('Stopped local stream tracks.');
        }
      }
      delete (window as any).webrtcServiceInstance;
      setLocalStream(null);
      setRemoteStreams(new Map());
      setWebrtcService(null);
    };
  }, [roomId, handleRemoteStreamAdded, handleRemoteStreamRemoved]);


  if (!localStream) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-x-bg text-x-text-primary">
        <div className="text-center p-8 bg-x-card rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Permissions Required</h2>
          <p className="mb-6 text-x-text-secondary">Please allow access to your camera and microphone to join the room.</p>
          <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-x-accent border-t-transparent"></div>
          <p className="mt-4 text-sm text-x-text-secondary">Waiting for permissions...</p>
        </div>
      </div>
    );
  }

  // Combine local and remote streams into an object for VideoGrid
  const allStreamsObject: { [id: string]: MediaStream } = {};
  if (localStream) {
    allStreamsObject['local'] = localStream;
  }
  remoteStreams.forEach((stream, peerId) => {
    allStreamsObject[peerId] = stream;
  });

  console.log('allStreamsObject:', allStreamsObject);
  return (
    <div className="flex h-screen flex-col bg-[#202124] text-white">
      <Header 
        roomId={roomId} 
        uptime={uptime} 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
      <div className="flex flex-1 overflow-hidden">
        <VideoGrid streams={allStreamsObject} />
        <SidebarTabs activeTab={activeTab} />
      </div>
    </div>
  );
} 