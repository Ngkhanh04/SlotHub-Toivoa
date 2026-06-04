import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, { autoConnect: false, transports: ['websocket', 'polling'] });
  }
  return socket;
};

export const connectUserSocket = (userId) => {
  const s = getSocket();
  if (!s.connected) s.connect();
  if (userId) s.emit('join_user', userId);
  return s;
};

export const disconnectSocket = () => {
  if (socket?.connected) socket.disconnect();
};
