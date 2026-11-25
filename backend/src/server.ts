import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { store } from './db/store';

async function bootstrap() {
  await store.init();
  const app = createApp();
  const server = http.createServer(app);

  const io = new SocketIOServer(server, {
    cors: {
      origin: env.FRONTEND_URL.split(',').map((s) => s.trim()),
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    socket.on('join:org', (orgId: string) => {
      if (orgId) socket.join(`org:${orgId}`);
    });
    socket.on('voice:state', (payload: { conversationId: string; state: string }) => {
      socket.broadcast.emit('voice:state', payload);
    });
  });

  server.listen(env.PORT, () => {
    console.log(
      `[VoxSales AI] Backend running on http://localhost:${env.PORT} | DB: ${store.backendType}`
    );
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
