import Fastify from 'fastify';
import bookingsRoutes from './routes/bookings.js';
import { HOST, PORT } from './utils/config.js';

const buildServer = () => {
  const server = Fastify({
    logger: true,
  });

  server.register(bookingsRoutes, { prefix: '/api/bookings' });

  return server;
};

const start = async () => {
  const server = buildServer();

  try {
    await server.listen({ port: PORT, host: HOST });
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
};

start()

