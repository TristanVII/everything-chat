import React from 'react';

interface RoomPageProps {
  params: {
    id: string;
  };
}

export default function RoomPage({ params }: RoomPageProps) {
  const { id } = params;

  return (
    <div>
      <h1>Room ID: {id}</h1>
      {/* Content for the specific room will go here */}
    </div>
  );
} 