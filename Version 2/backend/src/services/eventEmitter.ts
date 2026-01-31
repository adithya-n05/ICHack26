// backend/src/services/eventEmitter.ts
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initializeEventEmitter(socketServer: SocketServer) {
  io = socketServer;
}

export function broadcastNewEvent(event: any) {
  if (io) {
    io.emit('new-event', event);
    console.log('Broadcast event:', event.id);
  }
}

export function broadcastNewNews(news: any) {
  if (io) {
    io.emit('new-news', news);
    console.log('Broadcast news:', news.id);
  }
}

export function broadcastEventUpdate(event: any) {
  if (io) {
    io.emit('event-update', event);
  }
}
