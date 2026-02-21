import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import VideoCall from './VideoCall';

export default function GlobalCallHandler() {
    const { user, globalSocket, apiFetch } = useAuth();
    const [incomingCall, setIncomingCall] = useState(null);
    const [isCalling, setIsCalling] = useState(null); // The connection object of who we are calling
    const [activeCall, setActiveCall] = useState(null); // The actual VideoCall props { roomId, otherName, connectionId }

    // We need to fetch connections to get names when receiving a call, or we can just rely on the callerName passed from the server.
    // The server passes `callerName`, which is enough for the popup. The `VideoCall` component also uses `otherName`.

    useEffect(() => {
        if (!globalSocket) return;

        // Custom event so other components (like MessagesPage) can trigger an outbound call globally
        const handleStartCall = (e) => {
            const { connection, targetUserId, callerName } = e.detail;
            setIsCalling(connection);
            globalSocket.emit('call-user', {
                targetUserId,
                callerName,
                connectionId: connection.id
            });
        };
        window.addEventListener('start-global-call', handleStartCall);

        globalSocket.on('incoming-call', (data) => {
            setIncomingCall(data);
            const audio = new Audio('/ringtone.mp3');
            audio.play().catch(() => { });
        });

        globalSocket.on('call-accepted', ({ roomId }) => {
            // Outbound call was accepted
            const otherName = user.role === 'STUDENT' ? isCalling.mentor_name : isCalling.student_name;
            const connectionId = isCalling.id;
            setIsCalling(null);
            setActiveCall({ roomId, otherName, connectionId });
        });

        globalSocket.on('call-rejected', () => {
            setIsCalling(null);
            alert('Call declined by user.');
        });

        globalSocket.on('call-cancelled', () => {
            setIncomingCall(null);
        });

        return () => {
            window.removeEventListener('start-global-call', handleStartCall);
            globalSocket.off('incoming-call');
            globalSocket.off('call-accepted');
            globalSocket.off('call-rejected');
            globalSocket.off('call-cancelled');
        };
    }, [globalSocket, isCalling, user]);

    if (!user) return null;

    return (
        <>
            {/* Outbound Ringing */}
            {isCalling && (
                <div className="ring-overlay">
                    <div className="ring-modal">
                        <div className="ring-pulse-avatar">Outbound</div>
                        <h3>Calling {user.role === 'STUDENT' ? isCalling.mentor_name : isCalling.student_name}...</h3>
                        <p>Waiting for them to answer</p>
                        <button className="ring-btn-end" onClick={() => {
                            const targetUserId = user.role === 'STUDENT' ? isCalling.mentor_id : isCalling.student_id;
                            globalSocket.emit('cancel-call', { targetUserId });
                            setIsCalling(null);
                        }}>✕ Cancel Call</button>
                    </div>
                </div>
            )}

            {/* Inbound Ringing */}
            {incomingCall && (
                <div className="ring-overlay inbound">
                    <div className="ring-modal">
                        <div className="ring-pulse-avatar inbound-ani">Incoming</div>
                        <h3>{incomingCall.callerName} is calling you</h3>
                        <p>Live Video Call</p>
                        <div className="ring-actions">
                            <button className="ring-btn-accept" onClick={() => {
                                globalSocket.emit('call-accepted', { callerSocketId: incomingCall.callerSocketId, roomId: incomingCall.roomId });
                                setActiveCall({
                                    roomId: incomingCall.roomId,
                                    otherName: incomingCall.callerName,
                                    connectionId: incomingCall.connectionId
                                });
                                setIncomingCall(null);
                            }}>📞 Accept</button>
                            <button className="ring-btn-reject" onClick={() => {
                                globalSocket.emit('call-rejected', { callerSocketId: incomingCall.callerSocketId });
                                setIncomingCall(null);
                            }}>✕ Decline</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Video Call */}
            {activeCall && (
                <VideoCall
                    connectionId={activeCall.connectionId} // to build roomId inside VideoCall or directly pass socket if needed
                    userName={user.name}
                    otherName={activeCall.otherName}
                    onClose={() => setActiveCall(null)}
                />
            )}
        </>
    );
}
