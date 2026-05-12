"use client";
import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface OnlineUser {
  username: string;
  lastSeen: number;
  sessionDuration: number;
}

export function useSocket(username: string | null) {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!username) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join', { username });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('online-users', (users: OnlineUser[]) => {
      setOnlineUsers(users);
    });

    // Heartbeat every 30 seconds
    const heartbeat = setInterval(() => {
      socket.emit('heartbeat');
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      socket.disconnect();
    };
  }, [username]);

  return { isConnected, onlineUsers };
}
