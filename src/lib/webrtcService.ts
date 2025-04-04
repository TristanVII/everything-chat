export class WebRTCService {
    private _localStream: Promise<MediaStream> | null = null;
    private _remoteStreams: Map<string, MediaStream> = new Map();
    private roomId: string;
    public signalingChannel: SignalingServer;

    constructor(roomId: string) {
        this.roomId = roomId;
        this.initializeMedia();
        this.signalingChannel = this.initializeSignalingChannel();
    }

    get localStream() {
        if (!this._localStream) {
            this._localStream = this.initializeMedia();
        }
        return this._localStream;
    }

    get remoteStreams() {
        return this._remoteStreams;
    }

    private async initializeMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            return stream;
        } catch (error) {
            throw new Error("Failed to initialize media. Please try again.")
        }
    }

    private initializeSignalingChannel() {
        const signalingChannel = new SignalingServer(this.roomId);
        return signalingChannel;
    }
}

// move to separate file
class SignalingServer {
    public ws: WebSocket;
    public roomId: string;
    private peerConnectionPool: Map<string, RTCPeerConnection>;

    constructor(roomId: string) {
        this.roomId = roomId;
        this.ws = new WebSocket(`ws://localhost:8080/ws?roomId=${roomId}`);
        console.log('WS created')
        this.ws.onmessage = this.handleMessage.bind(this);
        this.peerConnectionPool = new Map<string, RTCPeerConnection>();
    }

    private async handleMessage(msg: MessageEvent): Promise<void> {
        const wrappedData = JSON.parse(msg.data);
        console.log('Received data:', wrappedData);
        const id = wrappedData.id;
        const event = wrappedData.event;
        const content = wrappedData.content;
        const userId = wrappedData.userId;
        // handle message types
        switch (event) {
            case 'video_offer':
                await this.handleLocalVideoOffer(userId, content);
                break;
            case 'video_answer':
                await this.handleRemoteVideoAnswer(userId, content);
                break;
            case 'user_connected':
                this.addPeerToMap(userId);
                break;
            default:
                console.log('Unknown message type:', event);
                break;
        }
    }
    
    private async handleLocalVideoOffer(userId: string, content: any): Promise<void> {
        const peerConnection = this.peerConnectionPool.get(userId);
        if (!peerConnection) {
            console.log('No peer connection found for user:', userId);
            return;
        }
        peerConnection.setRemoteDescription(content)
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        this.send('video_answer', {id: this.roomId, answer: answer});
    }

    private async handleRemoteVideoAnswer(userId: string, content: any): Promise<void> {
        const peerConnection = this.peerConnectionPool.get(userId);
        if (!peerConnection) {
            console.log('No peer connection found for user:', userId);
            return;
        }
        peerConnection.setRemoteDescription(content);
    }

    public send(messageType: string, data: any): void {
        console.log('Sending message:', messageType, data, this.ws);
        this.ws.send(JSON.stringify({
            type: messageType,
            data: data
        }));
    }
    
    public addPeerToMap(id: string): RTCPeerConnection {
        const peerConnection = new RTCPeerConnection();
        this.peerConnectionPool.set(id, peerConnection);
        this.setPeerConnectionHandlers(peerConnection);
        return peerConnection;
    }

    private setPeerConnectionHandlers(peerConnection: RTCPeerConnection): void {
        console.log('Setting peer connection handlers');
        peerConnection.onnegotiationneeded = async () => {
            console.log('Negotiation needed');
            const offer = await peerConnection.createOffer();
            console.log('Offer created');
            await peerConnection.setLocalDescription(offer);
            console.log('Offer set');
            this.send('video_offer', {id: this.roomId, offer: offer});
        }
    }
    
    
}
