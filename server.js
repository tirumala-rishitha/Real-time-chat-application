import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);

// Configure CORS
app.use(cors({
  origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true
}));

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Store messages and connected users
let messages = [];
let connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send existing messages to newly connected user
  socket.emit('message_history', messages);
  
  // Handle user joining
  socket.on('join', (userData) => {
    connectedUsers.set(socket.id, {
      id: socket.id,
      username: userData.username,
      joinedAt: new Date()
    });
    
    // Broadcast user joined
    socket.broadcast.emit('user_joined', {
      username: userData.username,
      timestamp: new Date()
    });
    
    // Send updated user count
    io.emit('user_count', connectedUsers.size);
  });
  
  // Handle new messages
  socket.on('send_message', (messageData) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const message = {
        id: Date.now() + Math.random(),
        text: messageData.text,
        username: user.username,
        timestamp: new Date(),
        userId: socket.id
      };
      
      messages.push(message);
      
      // Broadcast message to all connected clients
      io.emit('receive_message', message);
    }
  });
  
  // Handle typing indicators
  socket.on('typing_start', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_typing', {
        username: user.username,
        isTyping: true
      });
    }
  });
  
  socket.on('typing_stop', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('user_typing', {
        username: user.username,
        isTyping: false
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      connectedUsers.delete(socket.id);
      
      // Broadcast user left
      socket.broadcast.emit('user_left', {
        username: user.username,
        timestamp: new Date()
      });
      
      // Send updated user count
      io.emit('user_count', connectedUsers.size);
    }
    
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
});