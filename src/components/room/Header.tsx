'use client';

import { FiVideo, FiMic, FiShare, FiLogOut, FiMoreHorizontal, FiUsers, FiMessageSquare, FiThumbsUp, FiGrid, FiShield, FiClipboard, FiCheck } from 'react-icons/fi';
import { TabType } from './SidebarTabs'; // Import the type
import { useState } from 'react';

interface HeaderProps {
  roomId: string;
  uptime: string;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export default function Header({ roomId, uptime, activeTab, setActiveTab }: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(roomId)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
      })
      .catch(err => {
        console.error('Failed to copy room ID: ', err);
        // Optionally show an error message to the user
      });
  };

  return (
    <header className="flex h-16 items-center justify-between bg-[#292c33] px-4 text-gray-300 shadow-md border-b border-x-border">
      <div className="flex items-center space-x-4">
        <FiShield className="h-5 w-5 text-green-500" />
        <span className="text-sm font-medium">{uptime}</span>
        {/* <span className="text-sm text-gray-500">| Room: {roomId}</span> */}
      </div>
      
      {/* Placeholder for top center controls */}
      <div className="hidden md:flex items-center space-x-6">
        <button 
          className={`flex flex-col items-center p-2 rounded ${activeTab === 'chat' ? 'text-white bg-gray-600' : 'hover:text-white'}`}
          onClick={() => setActiveTab('chat')}
        >
            <FiMessageSquare className="h-5 w-5 mb-1" />
            <span className="text-xs">Chat</span>
        </button>
        <button 
          className={`flex flex-col items-center p-2 rounded ${activeTab === 'users' ? 'text-white bg-gray-600' : 'hover:text-white'}`}
          onClick={() => setActiveTab('users')}
        >
            <FiUsers className="h-5 w-5 mb-1" />
            <span className="text-xs">People</span>
        </button>
        {/* Add other icons like Raise, React, View here */}
      </div>

      <div className="flex items-center space-x-4">
        <button className="flex items-center space-x-1 rounded px-2 py-1 hover:bg-gray-700">
          <FiVideo className="h-5 w-5" />
          {/* Add dropdown indicator */}
        </button>
        <button className="flex items-center space-x-1 rounded px-2 py-1 hover:bg-gray-700">
          <FiMic className="h-5 w-5" />
           {/* Add dropdown indicator */}
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center space-x-1 rounded px-3 py-1.5 hover:bg-gray-700 relative"
          title="Copy Room ID"
        >
          {copied ? <FiCheck className="h-5 w-5 text-green-500" /> : <FiClipboard className="h-5 w-5" />}
          <span className="hidden sm:inline text-sm">Share</span>
        </button>
        <button className="flex items-center space-x-2 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
          <FiLogOut className="h-4 w-4" />
          <span>Leave</span>
        </button>
      </div>
    </header>
  );
} 