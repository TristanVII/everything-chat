import { SignalingMessage } from "@/hooks/useWebRTC";

/**
 * SignalingServer is a class that handles the signaling server for a room.
 * It is responsible for sending and receiving messages to and from the server.
 * It also handles the creation and management of peer connections.
 */
export class SignalingServer {
    private ws: WebSocket;
    private roomId: string;
    private peerConnections: Map<string, RTCPeerConnection>;
    private remoteStreams: Map<string, MediaStream>;
    public onMessageCallback?: ((message: SignalingMessage) => void) | null;
    public messageQueue: SignalingMessage[] = []
    
    constructor(ws: WebSocket, roomId: string) {
        this.ws = ws;
        this.roomId = roomId;
        this.peerConnections = new Map();
        this.remoteStreams = new Map();
        this.initWS();
    }
    

    public send(message: SignalingMessage) {
        const messageString = JSON.stringify(message);
        if (this.ws.readyState === WebSocket.OPEN) {
            console.log('[SignalingServer SEND]', messageString);
            this.ws.send(messageString);
        } else {
            this.messageQueue.push(message);
        }
    }

    public onMessage(callback: (message: SignalingMessage) => void) {
        this.onMessageCallback = callback;
    }

    public disconnect() {
        if(this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
        }
    }
    
    
    private initWS() {
        this.ws.onopen = () => {
            console.log('WebSocket connected to signaling server.');
            // Send queued messages
            while (this.messageQueue.length > 0) {
                const message = this.messageQueue.shift();
                if (message) {
                    this.send(message);
                }
            }
            this.send({type: 'join-room', payload: {roomId: this.roomId}});
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data as string) as SignalingMessage;
                if (this.onMessageCallback) {
                    this.onMessageCallback(message);
                }
            } catch (error) {
                console.log('Failed to parse signaling message:', event.data, error);
            }
        };

        this.ws.onerror = (error) => {
            console.log('WebSocket error:', error);
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.onMessageCallback = null; // Clear callback on close
        };
    }

}
