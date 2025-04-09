import { rtcConfiguration } from "./webrtcConfig";

// Define callback types
type RemoteStreamCallback = (peerId: string, stream: MediaStream) => void;
type RemoteStreamRemovedCallback = (peerId: string) => void;

// Define a type for the standard WebSocket message format
interface WsMessage {
    type: string;
    senderId: string; // ID of the user sending the message
    targetUserId?: string; // Optional: ID of the specific recipient
    data: any; // Payload (offer, answer, candidate, user info, etc.)
}

export class WebRTCService {
    private _localStreamPromise: Promise<MediaStream> | null = null;
    private _remoteStreams: Map<string, MediaStream> = new Map();
    private roomId: string;
    public signalingChannel: SignalingServer;
    private onRemoteStreamAdded: RemoteStreamCallback;
    private onRemoteStreamRemoved: RemoteStreamRemovedCallback;
    public ownUserId: string | null = null; // Store our own user ID

    constructor(
        roomId: string,
        onRemoteStreamAdded: RemoteStreamCallback,
        onRemoteStreamRemoved: RemoteStreamRemovedCallback // Add callback for removal
    ) {
        this.roomId = roomId;
        this.onRemoteStreamAdded = onRemoteStreamAdded;
        this.onRemoteStreamRemoved = onRemoteStreamRemoved; // Store callback
        this._localStreamPromise = this.initializeMedia(); // Start initializing media immediately

        // Pass callbacks and a way to set the user ID back to the service
        this.signalingChannel = this.initializeSignalingChannel(
            onRemoteStreamAdded,
            onRemoteStreamRemoved,
            (userId: string) => { this.ownUserId = userId; } // Callback to set own user ID
        );
    }

    get localStream(): Promise<MediaStream> | null {
        // Return the existing promise or initialize if needed (should generally be initialized by constructor)
        if (!this._localStreamPromise) {
            this._localStreamPromise = this.initializeMedia();
        }
        return this._localStreamPromise;
    }

    private async initializeMedia(): Promise<MediaStream> {
        console.log("Initializing media...");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            console.log("Media stream acquired:", stream);
            return stream;
        } catch (error) {
            console.error("Failed to get user media:", error);
            throw new Error("Failed to initialize media. Please grant camera/microphone permissions and try again.");
        }
    }

    private initializeSignalingChannel(
        onRemoteStreamAdded: RemoteStreamCallback,
        onRemoteStreamRemoved: RemoteStreamRemovedCallback,
        setOwnUserId: (userId: string) => void // Accept callback to set user ID
    ): SignalingServer {
        console.log(`Initializing signaling channel for room: ${this.roomId}`);
        // Pass callbacks down
        const signalingChannel = new SignalingServer(
            this.roomId,
            onRemoteStreamAdded,
            onRemoteStreamRemoved,
            setOwnUserId // Pass the callback down
        );
        return signalingChannel;
    }

    // Method to add local tracks to a specific peer connection
    public async addLocalTracksToPeer(targetUserId: string): Promise<void> {
        const peerConnection = this.signalingChannel.getPeerConnection(targetUserId);
        if (!peerConnection) {
            console.warn(`Cannot add tracks: No peer connection found for ${targetUserId}`);
            return;
        }

        console.log(`Attempting to add local tracks to peer ${targetUserId}...`);
        const localStream = await this.localStream; // Await the promise
        if (localStream) {
            localStream.getTracks().forEach(track => {
                try {
                    if (peerConnection.getSenders().find(sender => sender.track === track)) {
                         console.log(`Track (${track.kind}) already added to peer ${targetUserId}. Skipping.`);
                         return;
                    }
                    console.log(`Adding local ${track.kind} track to peer ${targetUserId}`);
                    peerConnection.addTrack(track, localStream);
                } catch (error) {
                    console.error(`Error adding ${track.kind} track to peer ${targetUserId}:`, error);
                }
            });
            console.log(`Finished adding tracks for peer ${targetUserId}. Current senders:`, peerConnection.getSenders());
             // Negotiation might be needed after adding tracks, often handled by onnegotiationneeded
        } else {
            console.error(`Local stream not available when trying to add tracks for ${targetUserId}.`);
        }
    }

     // Method to initiate connection to all existing peers (called after receiving 'your_info')
     public async connectToExistingPeers(allUserIds: string[]): Promise<void> {
         console.log(`ConnectToExistingPeers called. Own ID: ${this.ownUserId}, All IDs: ${allUserIds}`);
         if (!this.ownUserId) {
             console.error("Cannot connect to peers without knowing own user ID.");
             return;
         }

         const otherUserIds = allUserIds.filter(id => id !== this.ownUserId);
         console.log(`Attempting to connect to other users: ${otherUserIds.join(', ')}`);

         if (otherUserIds.length === 0) {
            console.log("No other users in the room to connect to.");
            return;
         }

         for (const userId of otherUserIds) {
             console.log(`Initiating connection sequence for existing user: ${userId}`);
             // 1. Ensure peer connection exists (addPeerToMap handles creation)
             const peerConnection = this.signalingChannel.addPeerToMap(userId);
             // 2. Add local tracks (this might trigger negotiationneeded)
             await this.addLocalTracksToPeer(userId);
             // 3. Explicitly trigger offer if negotiationneeded didn't fire (optional, depends on timing)
             //    It's often better to rely on the 'negotiationneeded' event handler.
             //    If negotiationneeded is reliable, this explicit offer creation might be redundant or cause race conditions.
             /*
             if (peerConnection.signalingState === 'stable') {
                 console.log(`Stable state for ${userId}, manually creating offer...`);
                 try {
                     const offer = await peerConnection.createOffer();
                     await peerConnection.setLocalDescription(offer);
                     console.log(`Manual offer created and set for ${userId}, sending...`);
                     this.signalingChannel.send('video_offer', { offer: offer }, userId); // Send offer specifically
                 } catch (error) {
                     console.error(`Error manually creating/sending offer for ${userId}:`, error);
                 }
             } else {
                  console.log(`Skipping manual offer for ${userId}, signaling state is ${peerConnection.signalingState}`);
             }
             */
         }
     }
}

// Should be in a separate file eventually
class SignalingServer {
    public ws!: WebSocket; // Add definite assignment assertion
    public roomId: string;
    private peerConnectionPool: Map<string, RTCPeerConnection>;
    private onRemoteStreamAdded: RemoteStreamCallback;
    private onRemoteStreamRemoved: RemoteStreamRemovedCallback;
    private setOwnUserId: (userId: string) => void; // Callback to inform WebRTCService of its ID
    private ownUserId: string | null = null; // Store own ID locally too if needed, or rely on WebRTCService instance
    private connectionRetryTimeout: number = 5000; // 5 seconds
    private connectionAttempts: number = 0;
    private maxConnectionAttempts: number = 5;
    private reconnectTimerId?: number | NodeJS.Timeout; // For potential reconnect logic

    constructor(
        roomId: string,
        onRemoteStreamAdded: RemoteStreamCallback,
        onRemoteStreamRemoved: RemoteStreamRemovedCallback,
        setOwnUserId: (userId: string) => void // Receive callback
    ) {
        this.roomId = roomId;
        this.onRemoteStreamAdded = onRemoteStreamAdded;
        this.onRemoteStreamRemoved = onRemoteStreamRemoved;
        this.setOwnUserId = setOwnUserId;
        this.peerConnectionPool = new Map<string, RTCPeerConnection>();
        this.connectWebSocket(); // Initialize WebSocket connection
    }

    private connectWebSocket(): void {
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            console.log("WebSocket connection already open or connecting.");
            return;
        }

        const wsUrl = `ws://localhost:8080/ws?roomId=${this.roomId}`;
        console.log(`Attempting to connect WebSocket: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            this.connectionAttempts = 0; // Reset attempts on successful connection
             clearTimeout(this.reconnectTimerId); // Clear any pending reconnect timer
        };

        this.ws.onclose = (event) => {
            console.log(`WebSocket connection closed: Code=${event.code}, Reason='${event.reason}', Clean=${event.wasClean}`);
             // Attempt to reconnect with backoff, unless it was a clean close?
             // Be cautious with reconnect logic to avoid infinite loops on server errors
             /*
             if (!event.wasClean && this.connectionAttempts < this.maxConnectionAttempts) {
                 this.connectionAttempts++;
                 const delay = this.connectionRetryTimeout * Math.pow(2, this.connectionAttempts -1);
                 console.log(`WebSocket closed unexpectedly. Attempting reconnect ${this.connectionAttempts}/${this.maxConnectionAttempts} in ${delay}ms...`);
                 this.reconnectTimerId = setTimeout(() => this.connectWebSocket(), delay);
             } else if (this.connectionAttempts >= this.maxConnectionAttempts) {
                 console.error("Max WebSocket reconnection attempts reached.");
             }
             */
            // Clean up all peer connections on WebSocket close
            this.cleanupAllPeers();
        };

        this.ws.onerror = (error) => {
             console.error('WebSocket error:', error);
             // The 'onclose' event will usually follow an error.
        };

        this.ws.onmessage = this.handleMessage.bind(this);
    }


    private async handleMessage(event: MessageEvent): Promise<void> {
        let msg: WsMessage;
        try {
            msg = JSON.parse(event.data);
            console.log('Received message:', msg);

            if (!msg.type || !msg.senderId) {
                console.warn("Received message missing type or senderId:", msg);
                return;
            }

            const senderUserId = msg.senderId; // ID of the user who sent the message
            const data = msg.data; // The payload

            switch (msg.type) {
                case 'your_info': // Server telling us our own ID
                    this.ownUserId = data.userId;
                    this.setOwnUserId(data.userId); // Inform the parent service
                    console.log(`Received our user ID: ${this.ownUserId}`);
                    // Optionally, trigger connection to existing users if the server sends a list
                    // if (data.allUserIds) {
                    //    const service = (window as any).webrtcServiceInstance; // Need a better way to access service
                    //    if (service) {
                    //        await service.connectToExistingPeers(data.allUserIds);
                    //    }
                    // }
                    break;

                case 'user_connected': // A new user joined (senderId is the new user)
                    console.log(`User ${senderUserId} connected.`);
                    // If we are an existing user, we initiate the connection *to* the new user
                    if (this.ownUserId && this.ownUserId !== senderUserId) {
                        console.log(`New user ${senderUserId} detected. Initiating connection sequence...`);
                         // 1. Create Peer Connection if it doesn't exist
                         const peerConnection = this.addPeerToMap(senderUserId);
                         // 2. Add tracks (will likely trigger negotiationneeded)
                         const service = (window as any).webrtcServiceInstance; // Access global instance (use context/props in real app)
                         if (service) {
                             await service.addLocalTracksToPeer(senderUserId);
                         } else {
                             console.error("Could not find WebRTCService instance to add tracks for new user.");
                         }
                         // 3. Rely on 'negotiationneeded' to send the offer.
                    } else if (!this.ownUserId) {
                        console.warn("Received user_connected before own user ID is known.");
                        // Might need to queue this connection attempt until 'your_info' is received.
                    }
                    break;

                case 'video_offer': // Received an offer *from* senderUserId
                    if (!data.offer) {
                         console.error("Received 'video_offer' without offer data from:", senderUserId);
                         return;
                    }
                    await this.handleIncomingOffer(senderUserId, data.offer);
                    break;

                case 'video_answer': // Received an answer *from* senderUserId
                     if (!data.answer) {
                        console.error("Received 'video_answer' without answer data from:", senderUserId);
                        return;
                   }
                    await this.handleIncomingAnswer(senderUserId, data.answer);
                    break;

                case 'ice_candidate': // Received a candidate *from* senderUserId
                    if (!data.candidate) {
                        console.error("Received 'ice_candidate' without candidate data from:", senderUserId);
                        return;
                   }
                    await this.handleIncomingIceCandidate(senderUserId, data.candidate);
                    break;

                 case 'user_disconnected': // senderId is the user who left
                     console.log(`User ${senderUserId} disconnected.`);
                     this.onRemoteStreamRemoved(senderUserId); // Notify UI
                     this.cleanupPeerConnection(senderUserId); // Clean up resources for that specific peer
                     break;

                default:
                    console.log('Unknown message type received:', msg.type);
                    break;
            }
        } catch (error) {
             console.error("Error handling WebSocket message:", error, event.data);
        }
    }

    // Renamed handler for clarity
    private async handleIncomingOffer(senderUserId: string, offer: RTCSessionDescriptionInit): Promise<void> {
        console.log(`Received video offer from ${senderUserId}`);
        // Ensure peer connection exists or create it
        const peerConnection = this.addPeerToMap(senderUserId);

        // Add tracks *before* setting remote description and creating answer,
        // especially if this side didn't initiate.
        const service = (window as any).webrtcServiceInstance;
        if (service && peerConnection.getReceivers().length === 0) { // Add tracks if not already done
            console.log(`Adding local tracks for ${senderUserId} before handling offer.`);
            await service.addLocalTracksToPeer(senderUserId);
        }

        try {
            // Check signaling state BEFORE setting remote description
            if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
                console.warn(`Cannot handle offer from ${senderUserId}, signaling state is ${peerConnection.signalingState}. Might need rollback.`);
                // Basic handling: If we already have a remote offer, maybe ignore this one or implement rollback
                 if (peerConnection.signalingState === 'have-remote-offer') {
                     console.log(`Already have a remote offer from ${senderUserId}, potentially glare. Ignoring new offer for now.`);
                     return; // Simple glare resolution: ignore incoming offer if we already have one.
                 }
                // Consider more robust glare handling if necessary
            }

             console.log(`Setting remote description (offer) from ${senderUserId}.`);
             await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

             console.log(`Remote description (offer) set for ${senderUserId}. Creating answer...`);
             const answer = await peerConnection.createAnswer();
             await peerConnection.setLocalDescription(answer);
             console.log(`Local description (answer) set for ${senderUserId}. Sending answer...`);
             // Send the answer back specifically to the sender of the offer
             this.send('video_answer', { answer: answer }, senderUserId); // Pass senderUserId as targetUserId
         } catch (error) {
             console.error(`Error handling video offer from ${senderUserId}:`, error);
         }
    }

    // Renamed handler for clarity
    private async handleIncomingAnswer(senderUserId: string, answer: RTCSessionDescriptionInit): Promise<void> {
        console.log(`Received video answer from ${senderUserId}`);
        const peerConnection = this.peerConnectionPool.get(senderUserId);
        if (!peerConnection) {
            console.warn(`No peer connection found for user ${senderUserId} when handling answer.`);
            return;
        }

        try {
             // Check signaling state before setting remote description
             if (peerConnection.signalingState !== 'have-local-offer') {
                 console.warn(`Cannot handle answer from ${senderUserId}, signaling state is ${peerConnection.signalingState} (expected have-local-offer).`);
                 return; // Ignore answer if we weren't expecting one
             }
             console.log(`Setting remote description (answer) from ${senderUserId}.`);
             await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
             console.log(`Remote description (answer) set for ${senderUserId}. Connection should be established.`);
         } catch (error) {
             console.error(`Error handling video answer from ${senderUserId}:`, error);
         }
    }

     // Renamed handler for clarity
     private async handleIncomingIceCandidate(senderUserId: string, candidate: RTCIceCandidateInit): Promise<void> {
        const peerConnection = this.peerConnectionPool.get(senderUserId);
        if (!peerConnection) {
            console.warn(`No peer connection found for user ${senderUserId} when handling ICE candidate.`);
            return;
        }

        // It's generally safe to add candidates even before the remote description is set
        try {
            if (candidate && candidate.candidate) { // Ensure candidate is not null/empty
                console.log(`Adding ICE candidate received from ${senderUserId}`);
                await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            } else {
                 console.log(`Received empty/null ICE candidate from ${senderUserId}, ignoring.`);
            }
        } catch (error: any) { // Type error as any
             // Ignore benign errors like adding candidate before remote description is set
             if (error.name === 'InvalidStateError' && peerConnection.remoteDescription === null) {
                console.warn(`Ignoring benign InvalidStateError for ICE candidate from ${senderUserId} (remote description not yet set).`);
             } else {
                console.error(`Error adding ICE candidate from ${senderUserId}:`, error);
             }
        }
    }


    // Updated send method to use the standard WsMessage format
    public send(messageType: string, data: any, targetUserId?: string): void {
        if (!this.ownUserId) {
            console.error("Cannot send message: Own user ID not set yet.");
            return;
        }
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WsMessage = {
                type: messageType,
                senderId: this.ownUserId, // Always include our ID as the sender
                targetUserId: targetUserId, // Optional target user ID
                data: data // The specific payload
            };
            console.log('Sending message:', message);
            this.ws.send(JSON.stringify(message));
        } else {
            console.error(`Cannot send message (${messageType}), WebSocket is not open. State: ${this.ws?.readyState}`);
             // Optionally queue messages or attempt reconnect here
        }
    }

    // Creates or retrieves a peer connection, sets up handlers
    public addPeerToMap(userId: string): RTCPeerConnection {
        if (this.peerConnectionPool.has(userId)) {
            // console.log(`Peer connection for ${userId} already exists.`);
            return this.peerConnectionPool.get(userId)!;
        }
        console.log(`Creating new peer connection for ${userId}`);
        const peerConnection = new RTCPeerConnection(rtcConfiguration);
        this.peerConnectionPool.set(userId, peerConnection);
        this.setPeerConnectionHandlers(userId, peerConnection);
        // Note: Don't need listenForIceCandidates as it's part of setPeerConnectionHandlers
        return peerConnection;
    }

    // Sets up all necessary event handlers for a peer connection
    private setPeerConnectionHandlers(userId: string, peerConnection: RTCPeerConnection): void {
        console.log(`Setting peer connection handlers for ${userId}`);

        // ICE Candidate Handler
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                 console.log(`Local ICE candidate generated for ${userId}, sending...`);
                // Send the candidate specifically to this peer
                this.send('ice_candidate', { candidate: event.candidate }, userId); // targetUserId is crucial
            } else {
                 console.log(`All local ICE candidates gathered for ${userId}.`);
            }
        };

        // Track Handler (Receiving remote media)
        peerConnection.ontrack = (event) => {
            console.log(`Track received from ${userId}:`, event.track.kind, event.streams);
            // A track is associated with one or more streams. Use the first stream.
            if (event.streams && event.streams[0]) {
                const stream = event.streams[0];
                console.log(`Calling onRemoteStreamAdded for ${userId} with stream ID: ${stream.id}`);
                this.onRemoteStreamAdded(userId, stream); // Use the callback
            } else {
                 // Sometimes tracks might arrive before streams are fully associated?
                 // Or maybe a track without a stream (e.g., data channel track)?
                 console.warn(`Track event from ${userId} did not contain streams. Track kind: ${event.track.kind}`);
                 // If it's audio/video, we might need to construct a stream manually or wait.
                 // For now, we rely on event.streams[0]
                 const newStream = new MediaStream();
                 newStream.addTrack(event.track);
                 console.log(`Manually created stream for track from ${userId}. Stream ID: ${newStream.id}`);
                 this.onRemoteStreamAdded(userId, newStream);
            }
        };

        // ICE Connection State Change Handler
        peerConnection.oniceconnectionstatechange = () => {
            const state = peerConnection.iceConnectionState;
            console.log(`ICE connection state change for ${userId}: ${state}`);
             if (state === 'disconnected' || state === 'closed' || state === 'failed') {
                 console.log(`Peer ${userId} ${state}. Cleaning up.`);
                 this.onRemoteStreamRemoved(userId); // Notify UI immediately
                 this.cleanupPeerConnection(userId); // Clean up resources
             }
             // 'disconnected' might recover, 'failed' is more permanent. 'closed' happens on pc.close().
             if (state === 'connected' || state === 'completed') {
                 console.log(`ICE connection established with ${userId}. State: ${state}`);
             }
        };

        // Negotiation Needed Handler (Key for initiating offers)
        peerConnection.onnegotiationneeded = async () => {
            console.log(`Negotiation needed for ${userId}, current signaling state: ${peerConnection.signalingState}`);
            // Avoid negotiation spam if an offer/answer exchange is already in progress
            // We should only create an offer if the state is 'stable'.
            if (peerConnection.signalingState !== 'stable') {
                 console.log(`Skipping negotiation needed for ${userId}, signaling state is not stable (${peerConnection.signalingState}).`);
                 return;
            }
            console.log(`Stable state detected, proceeding with offer creation for ${userId}...`);
            try {
                const offer = await peerConnection.createOffer();
                 // Double-check state *after* async operation, before setting local description
                 if (peerConnection.signalingState !== 'stable') {
                    console.log(`Skipping setLocalDescription for ${userId}, state changed to ${peerConnection.signalingState} after createOffer.`);
                    return;
                 }
                await peerConnection.setLocalDescription(offer);
                console.log(`Offer created and local description set for ${userId}, sending offer...`);
                // Send offer specifically to this user
                this.send('video_offer', { offer: offer }, userId); // targetUserId is crucial
            } catch (error) {
                 console.error(`Error creating/sending offer during negotiationneeded for ${userId}:`, error);
                 // Consider cleanup or retry logic here?
            }
        };

         // Signaling State Change Handler (for debugging)
         peerConnection.onsignalingstatechange = () => {
             console.log(`Signaling state change for ${userId}: ${peerConnection.signalingState}`);
         };

          // ICE Gathering State Change Handler (for debugging)
          peerConnection.onicegatheringstatechange = () => {
              console.log(`ICE gathering state change for ${userId}: ${peerConnection.iceGatheringState}`);
          };
    }

     // Clean up a specific peer connection
     private cleanupPeerConnection(userId: string): void {
         const peerConnection = this.peerConnectionPool.get(userId);
         if (peerConnection) {
             console.log(`Cleaning up peer connection for ${userId}`);
             // Remove handlers to prevent further events
             peerConnection.onicecandidate = null;
             peerConnection.ontrack = null;
             peerConnection.onnegotiationneeded = null;
             peerConnection.oniceconnectionstatechange = null;
             peerConnection.onsignalingstatechange = null;
             peerConnection.onicegatheringstatechange = null;

             // Stop senders and receivers
             peerConnection.getSenders().forEach(sender => {
                 if (sender.track) {
                     sender.track.stop(); // Stop the track
                 }
                 // Don't necessarily remove sender, closing connection handles it
                 // try { peerConnection.removeTrack(sender); } catch (e) { console.warn(`Error removing sender track for ${userId}:`, e); }
             });
              peerConnection.getReceivers().forEach(receiver => {
                  if (receiver.track) {
                      receiver.track.stop(); // Stop the track
                  }
              });


             // Close the connection
             peerConnection.close();

             // Remove from the pool
             this.peerConnectionPool.delete(userId);
             console.log(`Peer connection for ${userId} closed and removed from pool.`);
         } else {
             // console.log(`Cleanup requested for ${userId}, but no connection found in pool.`);
         }
     }

    // Clean up all peer connections (e.g., on WebSocket close)
    private cleanupAllPeers(): void {
        console.log("Cleaning up all peer connections...");
        const userIds = Array.from(this.peerConnectionPool.keys());
        userIds.forEach(userId => this.cleanupPeerConnection(userId));
        console.log("Finished cleaning up all peers.");
    }


    // Helper to get a specific peer connection
    public getPeerConnection(userId: string): RTCPeerConnection | undefined {
        return this.peerConnectionPool.get(userId);
    }

     // Call this method when the component/service is destroyed
     public destroy(): void {
        console.log("Destroying SignalingServer...");
        clearTimeout(this.reconnectTimerId); // Clear any pending reconnect timer
        this.cleanupAllPeers(); // Clean up peers first
        if (this.ws) {
            // Remove listeners before closing to prevent close handler logic during manual destruction
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null; // Crucial to prevent reconnect attempts after explicit destroy
            if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
                console.log("Closing WebSocket connection.");
                this.ws.close(1000, "Client shutting down"); // Use a normal closure code
            }
        }
        console.log("SignalingServer destroyed.");
    }
}

// --- Global Instance (Replace with proper state management/DI) ---
// This is generally bad practice for larger apps. Use React Context, Zustand, Redux, etc.
declare global {
    interface Window { webrtcServiceInstance?: WebRTCService; }
}
// Example of setting it (do this where you create the service)
// if (typeof window !== 'undefined') {
//     window.webrtcServiceInstance = new WebRTCService(...);
// }

