'use client';

import React, { useEffect, useRef } from 'react';

interface VideoGridProps {
    streams: { [id: string]: MediaStream }; // Accept streams map
}

// Function to determine grid layout based on participant count
const getGridLayout = (count: number): { cols: number; rows: number } => {
  if (count <= 0) return { cols: 1, rows: 1 };
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count <= 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 3, rows: 2 };
  if (count <= 8) return { cols: 4, rows: 2 };
  if (count === 9) return { cols: 3, rows: 3 };
  if (count === 10) return { cols: 5, rows: 2 };
  // Basic fallback for > 10
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
};

// Video element component to handle attaching the stream
const VideoPlayer = ({ stream, isLocal }: { stream: MediaStream, isLocal: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            console.log(`Attaching ${isLocal ? 'local' : 'remote'} stream to video element`);
            videoRef.current.srcObject = stream;
        } else {
            console.log("Video ref or stream not ready for attachment.");
        }
        // No cleanup needed for srcObject removal usually, browser handles it.
    }, [stream, isLocal]);

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline // Important for mobile browsers
            muted={isLocal} // Mute local stream to prevent echo
            className="w-full h-full object-cover" // Ensure video fills the container
        />
    );
};

export default function VideoGrid({ streams }: VideoGridProps) {
    const participantIds = Object.keys(streams); // Get IDs from the streams map
    const participantCount = participantIds.length;
    const { cols, rows } = getGridLayout(participantCount);

    const gridStyle = {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
    };

    return (
        <div
            className="flex-1 grid gap-1 p-1 bg-gray-100 overflow-auto"
            style={gridStyle}
        >
            {participantIds.map((id) => (
                <div
                    key={id}
                    className="relative flex items-center justify-center bg-black rounded overflow-hidden min-h-0 border border-gray-200" // Use black bg for video contrast
                >
                    <VideoPlayer stream={streams[id]} isLocal={id === 'local'} />
                    {/* Overlay for name */}
                    <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                        {id === 'local' ? 'You' : `User: ${id.substring(0, 6)}...`} {/* Display name/ID */}
                    </div>
                </div>
            ))}
            {/* Optional: Add placeholders if participantCount < cols * rows */}
        </div>
    );
} 