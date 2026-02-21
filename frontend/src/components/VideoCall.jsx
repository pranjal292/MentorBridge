import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Free public TURN relay — works across different networks / NAT
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        },
        {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

export default function VideoCall({ connectionId, userName, otherName, onClose }) {
    const [status, setStatus] = useState('connecting'); // connecting | waiting | in-call | ended
    const [muted, setMuted] = useState(false);
    const [camOff, setCamOff] = useState(false);
    const [error, setError] = useState('');

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef(null);
    const pcRef = useRef(null);         // RTCPeerConnection
    const localStreamRef = useRef(null);
    const isCallerRef = useRef(false);

    const roomId = `call-${connectionId}`;

    useEffect(() => {
        startCall();
        return () => cleanup();
    }, []);

    async function startCall() {
        try {
            // 1. Get local camera/mic
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            // 2. Connect socket to backend (via Vite proxy securely)
            const socket = io();
            socketRef.current = socket;

            // 3. Create peer connection
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Remote stream → remote video element
            pc.ontrack = (evt) => {
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = evt.streams[0];
                setStatus('in-call');
            };

            // ICE candidates → send via socket
            pc.onicecandidate = (evt) => {
                if (evt.candidate) {
                    socket.emit('ice-candidate', { roomId, candidate: evt.candidate });
                }
            };

            const pendingCandidates = [];

            // Socket events
            socket.on('user-joined', async ({ socketId, userName: remoteName }) => {
                // We are the caller — create and send offer
                isCallerRef.current = true;
                setStatus('in-call');
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('offer', { roomId, offer });
            });

            socket.on('offer', async ({ offer }) => {
                // We are the callee — receive offer, send answer
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socket.emit('answer', { roomId, answer });
                setStatus('in-call');

                // Process any queued ICE candidates
                pendingCandidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
                pendingCandidates.length = 0;
            });

            socket.on('answer', async ({ answer }) => {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
                // Process any queued ICE candidates
                pendingCandidates.forEach(c => pc.addIceCandidate(new RTCIceCandidate(c)).catch(console.error));
                pendingCandidates.length = 0;
            });

            socket.on('ice-candidate', async ({ candidate }) => {
                if (pc.remoteDescription && pc.remoteDescription.type) {
                    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch { }
                } else {
                    pendingCandidates.push(candidate);
                }
            });

            socket.on('user-left', () => {
                setStatus('ended');
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
            });

            // 4. Join the room
            setStatus('waiting');
            socket.emit('join-call', { roomId, userName });

        } catch (err) {
            setError(err.message || 'Could not access camera/microphone');
            setStatus('ended');
        }
    }

    function cleanup() {
        socketRef.current?.emit('leave-call', { roomId });
        socketRef.current?.disconnect();
        pcRef.current?.close();
        localStreamRef.current?.getTracks().forEach(t => t.stop());
    }

    function handleEnd() {
        cleanup();
        onClose();
    }

    function toggleMute() {
        localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
        setMuted(m => !m);
    }

    function toggleCam() {
        localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
        setCamOff(c => !c);
    }

    const statusLabel = {
        connecting: 'Starting camera…',
        waiting: `Waiting for ${otherName} to join…`,
        'in-call': `In call with ${otherName}`,
        ended: 'Call ended'
    }[status];

    return (
        <div className="vc-overlay" onClick={e => e.target === e.currentTarget && handleEnd()}>
            <div className="vc-modal">
                {/* Header */}
                <div className="vc-header">
                    <div className="vc-title">
                        {status === 'in-call' && <span className="video-live-dot" />}
                        {statusLabel}
                    </div>
                    <button className="vc-end-btn" onClick={handleEnd}>✕ End Call</button>
                </div>

                {/* Error */}
                {error && <div className="vc-error">⚠️ {error}<br /><small>Make sure camera/mic permissions are allowed.</small></div>}

                {/* Video grid */}
                <div className={`vc-grid ${status === 'in-call' ? 'two-up' : 'one-up'}`}>
                    {/* Remote (big) */}
                    <div className="vc-video-wrap remote">
                        <video ref={remoteVideoRef} autoPlay playsInline className="vc-video" />
                        {status !== 'in-call' && (
                            <div className="vc-waiting-overlay">
                                <div className="vc-waiting-avatar">{(otherName || '?')[0].toUpperCase()}</div>
                                <p>{status === 'waiting' ? 'Waiting for other person…' : status === 'ended' ? 'Call ended' : 'Connecting…'}</p>
                            </div>
                        )}
                        <div className="vc-name-tag">{otherName}</div>
                    </div>

                    {/* Local (pip) */}
                    <div className="vc-video-wrap local">
                        <video ref={localVideoRef} autoPlay playsInline muted className="vc-video" />
                        {camOff && <div className="vc-cam-off">📵</div>}
                        <div className="vc-name-tag">You</div>
                    </div>
                </div>

                {/* Controls */}
                <div className="vc-controls">
                    <button className={`vc-ctrl-btn ${muted ? 'off' : ''}`} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
                        {muted ? '🔇' : '🎙️'}
                    </button>
                    <button className={`vc-ctrl-btn ${camOff ? 'off' : ''}`} onClick={toggleCam} title={camOff ? 'Turn camera on' : 'Turn camera off'}>
                        {camOff ? '📵' : '📷'}
                    </button>
                    <button className="vc-ctrl-btn end" onClick={handleEnd} title="End call">📞</button>
                </div>
            </div>
        </div>
    );
}
