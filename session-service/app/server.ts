import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import { registerSessionRoutes } from './api/routes/session-routes';

// Create a function to create and configure a server instance
export function createServer(): FastifyInstance {
  const server = fastify({
    logger: false // Disable logging for tests
  });

  // Register plugins
  server.register(cors, {
    origin: '*'
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
      schemes: ['http'],
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

  return server;
}

// If this file is run directly, start the server
if (require.main === module) {
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const HOST = process.env.HOST || '0.0.0.0';
  
  const server = createServer();
  
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
}