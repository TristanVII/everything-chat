'use client';

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

// Placeholder component for video streams
export default function VideoGrid() {
  // Replace with actual WebRTC video elements and logic
  const participants = [
    "Tristan Davis", "User2 (Guest)", "User3 (Guest)", 
  ]; 
  const participantCount = participants.length;
  const { cols, rows } = getGridLayout(participantCount);

  // Define inline styles for the grid container
  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };

  return (
    // Apply Tailwind grid and the inline styles
    <div 
      className="flex-1 grid gap-1 p-1 bg-[#111111] overflow-auto"
      style={gridStyle}
    >
      {participants.map((name, index) => (
        <div 
          key={index} 
          className="relative flex items-center justify-center bg-black rounded overflow-hidden min-h-0" 
        >
          {/* Placeholder for video element */}
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            {/* In a real app, a <video> tag would go here */}
            <span className="text-lg text-center p-2">Video for {name}</span> 
          </div>
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
            {name}
          </div>
        </div>
      ))}
    </div>
  );
} 