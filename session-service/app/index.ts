import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { registerSessionRoutes } from './api/routes/session-routes';

// Load environment variables
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Create the Fastify server
const server = fastify({
  logger: true
});

// Register plugins
server.register(cors, {
  origin: process.env.CORS_ORIGIN || '*'
});

server.register(swagger, {
  routePrefix: '/docs',
  swagger: {
    info: {
      title: 'Session Service API',
      description: 'API for managing translation sessions',
      version: '1.0.0'
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here'
    },
    host: `${HOST}:${PORT}`,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json']
  },
  exposeRoute: true
});

// Register routes
server.register(registerSessionRoutes);

// Health check route
server.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start the server
const start = async () => {
  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`Server listening on ${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start(); 