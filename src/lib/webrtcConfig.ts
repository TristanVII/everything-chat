export const rtcConfiguration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN servers here if needed for production
    // {
    //   urls: 'turn:your.turn.server.com:3478',
    //   username: 'your_username',
    //   credential: 'your_password',
    // },
  ],
};

export const mediaConstraints: MediaStreamConstraints = {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    // You can add more constraints like frameRate if needed
    // frameRate: { ideal: 30 }
  },
}; 