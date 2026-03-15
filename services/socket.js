let io;

export const setSocketIo = (socketIoInstance) => {
  io = socketIoInstance;
};

export const getSocketIo = () => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};
