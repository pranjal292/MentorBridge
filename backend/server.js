require('dotenv').config();

// Crash prevention and logging
process.on('uncaughtException', (err) => {
    console.error('❌ CRITICAL: Uncaught Exception:', err);
    // Keep it alive if possible, or exit cleanly
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️ CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const express = require('express');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const { getDb } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'MentorBridge API is running' });
});

// ── WebRTC Signaling via Socket.io ──────────────────────
// Room = "call-{connectionId}" — only the two connected users know this ID
// Users also join "user-{id}" to receive incoming ringing notifications
io.on('connection', (socket) => {
    // Join personal root room for incoming rings
    socket.on('join-user-room', (userId) => {
        socket.join(`user-${userId}`);
        console.log(`👤 User ${userId} joined their personal ring room`);
    });

    // ── Ringing Flow ──
    socket.on('call-user', ({ targetUserId, callerName, connectionId }) => {
        console.log(`📞 ${callerName} is calling TargetUser ID: ${targetUserId} in Connection: ${connectionId}`);
        socket.to(`user-${targetUserId}`).emit('incoming-call', {
            callerName,
            connectionId,
            roomId: `call-${connectionId}`,
            callerSocketId: socket.id
        });
    });

    socket.on('call-accepted', ({ callerSocketId, roomId }) => {
        socket.to(callerSocketId).emit('call-accepted', { roomId });
    });

    socket.on('call-rejected', ({ callerSocketId }) => {
        socket.to(callerSocketId).emit('call-rejected');
    });

    socket.on('cancel-call', ({ targetUserId }) => {
        socket.to(`user-${targetUserId}`).emit('call-cancelled');
    });

    // ── Existing WebRTC Flow ──
    // Join a call room
    socket.on('join-call', ({ roomId, userName }) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', { socketId: socket.id, userName });
        console.log(`📹 ${userName} joined call room: ${roomId}`);
    });

    // Relay WebRTC offer to the other peer
    socket.on('offer', ({ roomId, offer }) => {
        socket.to(roomId).emit('offer', { offer, from: socket.id });
    });

    // Relay WebRTC answer back to caller
    socket.on('answer', ({ roomId, answer }) => {
        socket.to(roomId).emit('answer', { answer });
    });

    // Relay ICE candidates
    socket.on('ice-candidate', ({ roomId, candidate }) => {
        socket.to(roomId).emit('ice-candidate', { candidate });
    });

    // User leaves call
    socket.on('leave-call', ({ roomId }) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user-left');
    });

    socket.on('disconnect', () => {
        // Handled naturally by socket.io room cleanup
    });
});

// Initialize DB and start server
async function start() {
    await getDb();
    console.log('📦 Database initialized');

    // Routes (loaded after DB init)
    app.use('/api/auth', require('./routes/auth'));
    app.use('/api/profile', require('./routes/profile'));
    app.use('/api/ai', require('./routes/ai'));
    app.use('/api/connections', require('./routes/connections'));
    app.use('/api/messages', require('./routes/messages'));
    app.use('/api/reviews', require('./routes/reviews'));

    server.listen(PORT, () => {
        console.log(`🚀 MentorBridge server running on http://localhost:${PORT}`);
        console.log(`📹 WebRTC signaling active on ws://localhost:${PORT}`);
    });

    // ── Serve Production Frontend ──────────────────────────
    const distPath = path.join(__dirname, '../frontend/dist');
    if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));

        // Catch-all route for SPA (React Router)
        app.get('*', (req, res) => {
            if (!req.path.startsWith('/api')) {
                res.sendFile(path.join(distPath, 'index.html'));
            }
        });
        console.log('🌐 Serving production frontend from /dist');
    }
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
