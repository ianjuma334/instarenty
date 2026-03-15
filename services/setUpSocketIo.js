import { Server } from 'socket.io';
import { setSocketIo } from './socket.js';

const setupSocketIo = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    }
  });

  setSocketIo(io);
};

export default setupSocketIo;
