require('dotenv').config({ path: '.env.local' });
const { Server } = require('socket.io');
const http = require('http');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

// MongoDB Connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Socket Server: Connected to MongoDB'))
  .catch(err => console.error('Socket Server: MongoDB connection error:', err));

// Chat Message Schema (redundant but needed for standalone script)
const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', new mongoose.Schema({
  username: { type: String, required: true, lowercase: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}));

const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust as needed for production
    methods: ["GET", "POST"]
  }
});

const onlineUsers = new Map(); // username -> { socketId, lastSeen, sessionStart }

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join', ({ username }) => {
    if (!username) return;
    const lowerUsername = username.toLowerCase();
    
    onlineUsers.set(lowerUsername, {
      socketId: socket.id,
      lastSeen: Date.now(),
      sessionStart: Date.now()
    });
    
    socket.username = lowerUsername;
    console.log(`${lowerUsername} joined the chat`);
    
    // Broadcast updated online users
    broadcastOnlineUsers();
  });

  socket.on('chat-message', async (message) => {
    if (!socket.username) return;
    
    try {
      const chatMsg = new ChatMessage({
        username: socket.username,
        message: message
      });
      await chatMsg.save();
      
      io.emit('message', {
        _id: chatMsg._id.toString(),
        username: socket.username,
        message: message,
        timestamp: chatMsg.timestamp,
        isDeleted: false
      });
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('delete-message', async (messageId) => {
    if (!socket.username) return;
    console.log(`Attempting to delete message: ${messageId} by ${socket.username}`);
    
    try {
      const result = await ChatMessage.findByIdAndUpdate(messageId, { isDeleted: true });
      if (result) {
        console.log(`Message ${messageId} soft-deleted successfully`);
        io.emit('message-deleted', messageId);
      } else {
        console.log(`Message ${messageId} not found`);
      }
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  });

  socket.on('typing', (isTyping) => {
    if (!socket.username) return;
    socket.broadcast.emit('user-typing', {
      username: socket.username,
      isTyping
    });
  });

  socket.on('heartbeat', () => {
    if (!socket.username) return;
    const user = onlineUsers.get(socket.username);
    if (user) {
      user.lastSeen = Date.now();
      onlineUsers.set(socket.username, user);
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      console.log(`${socket.username} disconnected`);
      onlineUsers.delete(socket.username);
      broadcastOnlineUsers();
    }
  });
});

function broadcastOnlineUsers() {
  const users = Array.from(onlineUsers.entries()).map(([username, data]) => ({
    username,
    sessionDuration: Math.floor((Date.now() - data.sessionStart) / 1000 / 60), // in minutes
    lastSeen: data.lastSeen
  }));
  io.emit('online-users', users);
}

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
