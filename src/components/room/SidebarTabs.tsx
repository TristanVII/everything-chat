'use client';

import { useState } from 'react';
import { FiMessageSquare, FiUsers, FiX, FiSend, FiPaperclip, FiPlus } from 'react-icons/fi';

export type TabType = 'chat' | 'users'; // Export the type

interface SidebarTabsProps {
  activeTab: TabType; // Accept activeTab as a prop
}

// Placeholder component for Chat and User List tabs
export default function SidebarTabs({ activeTab }: SidebarTabsProps) { // Destructure the prop
  // const [activeTab, setActiveTab] = useState('chat'); // Remove internal state

  // Placeholder data
  const messages = [
    { sender: "System", text: "Meeting started", time: "4:13 p.m.", type: 'system' },
    { sender: "Tristan Davis", text: "joined the conversation.", time: "4:12 p.m.", type: 'join' },
    // Add more messages
  ];
  const users = ["Tristan Davis", "User2 (Guest)", "User3 (Guest)"]; // Example users

  return (
    <div className="w-80 flex-shrink-0 bg-[#292c33] flex flex-col text-gray-300 border-l border-gray-700">
      {/* Header with Title */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700 h-16">
        <h2 className="text-lg font-semibold text-white">
          {activeTab === 'chat' ? 'Meeting chat' : 'Participants'}
        </h2>
        {/* <button className="text-gray-400 hover:text-white">
          <FiX className="h-5 w-5" />
        </button> // Remove close button */}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'chat' && (
          <div className="space-y-3">
            {messages.map((msg, index) => (
              <div key={index} className="text-sm">
                {msg.type === 'system' ? (
                  <div className="text-center text-gray-500 text-xs my-2">--- {msg.text} ({msg.time}) ---</div>
                ) : (
                  <div>
                     <span className="text-gray-500 mr-2">{msg.time}</span>
                     <span className="font-medium text-white">{msg.sender}</span>
                     <span className="text-gray-400 ml-1">{msg.text}</span>
                  </div>
                )}
              </div>
            ))}
            {/* Add more chat messages here */}
            <div className="text-center text-gray-500 text-xs pt-4">Today 4:12 p.m.</div>
          </div>
        )}
        {activeTab === 'users' && (
          <div className="space-y-3">
            {users.map((user, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded hover:bg-gray-600">
                <span className="text-sm">{user}</span>
                {/* Add icons for mic/video status */}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Input Area (only shown on chat tab) */}
      {activeTab === 'chat' && (
        <div className="p-4 border-t border-gray-700 bg-[#292c33]">
          <div className="relative flex items-center">
            <textarea
              placeholder="Type a message" 
              className="w-full bg-[#3C3D40] rounded-md p-2 pr-10 text-sm text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-x-accent"
              rows={2}
            />
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-x-accent">
              <FiSend className="h-5 w-5" />
            </button>
          </div>
           <div className="flex items-center justify-between mt-2">
             <div className="flex space-x-2">
                 {/* <button className="text-gray-400 hover:text-white"><FiSmile className="h-5 w-5" /></button> // Remove emoji button */}
                 <button className="text-gray-400 hover:text-white"><FiPaperclip className="h-5 w-5" /></button>
                 <button className="text-gray-400 hover:text-white"><FiPlus className="h-5 w-5" /></button>
             </div>
             {/* Potential Send button if not using icon above */}
           </div>
        </div>
      )}
    </div>
  );
} 