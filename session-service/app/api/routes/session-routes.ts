import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { SessionService } from '../../services/session-service';
import { CreateSessionDto, UpdateSessionDto, SessionStatus } from '@/types';

const sessionService = new SessionService();

// Validation schemas
const createSessionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  presentation_id: z.string().uuid(),
  source_language: z.string().min(2),
  target_languages: z.array(z.string().min(2)),
  metadata: z.record(z.any()).optional()
});

const updateSessionSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum([
    SessionStatus.PENDING,
    SessionStatus.PROCESSING,
    SessionStatus.READY,
    SessionStatus.ERROR
  ]).optional(),
  target_languages: z.array(z.string().min(2)).optional(),
  metadata: z.record(z.any()).optional()
});

const accessSessionSchema = z.object({
  editorId: z.string().min(1),
  editorName: z.string().min(1)
});

// Route definitions
export const registerSessionRoutes = async (server: FastifyInstance) => {
  // Get all sessions for a user
  server.get('/api/users/:userId/sessions', async (request: FastifyRequest<{
    Params: { userId: string }
  }>, reply: FastifyReply) => {
    const { userId } = request.params;
    
    const result = await sessionService.getSessionsByUserId(userId);
    
    if (result.error) {
      return reply.status(500).send({ error: result.error });
    }
    
    return reply.status(200).send({ sessions: result.data });
  });

  // Get a session by ID
  server.get('/api/sessions/:sessionId', async (request: FastifyRequest<{
    Params: { sessionId: string }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    
    const result = await sessionService.getSessionById(sessionId);
    
    if (result.error) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    
    return reply.status(200).send({ session: result.data });
  });

  // Create a new session
  server.post('/api/users/:userId/sessions', async (request: FastifyRequest<{
    Params: { userId: string },
    Body: CreateSessionDto
  }>, reply: FastifyReply) => {
    const { userId } = request.params;
    
    try {
      const validatedBody = createSessionSchema.parse(request.body);
      const result = await sessionService.createSession(userId, validatedBody);
      
      if (result.error) {
        return reply.status(500).send({ error: result.error });
      }
      
      return reply.status(201).send({ session: result.data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Update a session
  server.patch('/api/sessions/:sessionId', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Body: UpdateSessionDto
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    
    try {
      const validatedBody = updateSessionSchema.parse(request.body);
      const result = await sessionService.updateSession(sessionId, validatedBody);
      
      if (result.error) {
        return reply.status(404).send({ error: 'Session not found' });
      }
      
      return reply.status(200).send({ session: result.data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Delete a session
  server.delete('/api/sessions/:sessionId', async (request: FastifyRequest<{
    Params: { sessionId: string }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    
    const result = await sessionService.deleteSession(sessionId);
    
    if (result.error) {
      return reply.status(500).send({ error: result.error });
    }
    
    return reply.status(204).send();
  });

  // Update session status
  server.patch('/api/sessions/:sessionId/status', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Body: { status: SessionStatus }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    const { status } = request.body;
    
    if (!Object.values(SessionStatus).includes(status)) {
      return reply.status(400).send({ error: 'Invalid status value' });
    }
    
    const result = await sessionService.updateSessionStatus(sessionId, status);
    
    if (result.error) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    
    return reply.status(200).send({ session: result.data });
  });

  // Update slide count
  server.patch('/api/sessions/:sessionId/slide-count', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Body: { slideCount: number }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    const { slideCount } = request.body;
    
    if (typeof slideCount !== 'number' || slideCount < 0) {
      return reply.status(400).send({ error: 'Invalid slide count' });
    }
    
    const result = await sessionService.updateSlideCount(sessionId, slideCount);
    
    if (result.error) {
      return reply.status(404).send({ error: 'Session not found' });
    }
    
    return reply.status(200).send({ session: result.data });
  });
  
  // Generate a shareable link for a session
  server.post('/api/sessions/:sessionId/share', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Body: { userId: string }
    Headers: { 'x-base-url'?: string }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    const { userId } = request.body;
    const baseUrl = request.headers['x-base-url'] || process.env.BASE_URL || 'http://localhost:3000';
    
    if (!userId) {
      return reply.status(400).send({ error: 'User ID is required' });
    }
    
    const result = await sessionService.generateShareLink(sessionId, userId, baseUrl);
    
    if (result.error) {
      return reply.status(403).send({ error: result.error });
    }
    
    return reply.status(200).send({ shareableLink: result.shareableLink });
  });
  
  // Validate session access
  server.get('/api/sessions/:sessionId/access', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Querystring: { userId?: string, token?: string }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    const { userId, token } = request.query;
    
    if (!userId && !token) {
      return reply.status(400).send({ error: 'Either userId or token is required' });
    }
    
    const result = await sessionService.validateSessionAccess(sessionId, userId, token);
    
    return reply.status(200).send(result);
  });
  
  // Update session access (when someone starts editing)
  server.post('/api/sessions/:sessionId/access', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Body: { editorId: string, editorName: string }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    
    try {
      const { editorId, editorName } = accessSessionSchema.parse(request.body);
      
      const result = await sessionService.updateSessionAccess(sessionId, editorId, editorName);
      
      if (result.error) {
        return reply.status(409).send({ error: result.error });
      }
      
      return reply.status(200).send({ session: result.data });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: error.errors });
      }
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
  
  // Release session access (when someone is done editing)
  server.delete('/api/sessions/:sessionId/access', async (request: FastifyRequest<{
    Params: { sessionId: string },
    Querystring: { editorId: string }
  }>, reply: FastifyReply) => {
    const { sessionId } = request.params;
    const { editorId } = request.query;
    
    if (!editorId) {
      return reply.status(400).send({ error: 'Editor ID is required' });
    }
    
    const result = await sessionService.releaseSessionAccess(sessionId, editorId);
    
    if (result.error) {
      return reply.status(403).send({ error: result.error });
    }
    
    return reply.status(200).send({ success: true });
  });
}; 