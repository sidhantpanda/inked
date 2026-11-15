import type { FastifyInstance } from 'fastify';

import type { AppServices } from './context.js';

/** Studio pickers: place geocoding, stock symbols, and the sports catalog. */
export function registerLookupsRoutes(
  app: FastifyInstance,
  { weatherService, sportsService, stocksService }: AppServices
) {
  app.get<{ Querystring: { q?: string; count?: string } }>(
    '/api/geocode',
    async (request, reply) => {
      const query = (request.query.q ?? '').trim();
      if (!query) return { results: [] };
      const count = Math.min(Math.max(Number(request.query.count) || 6, 1), 10);
      try {
        const results = await weatherService.geocode(query, count);
        return { results };
      } catch (error) {
        request.log.error(error);
        return reply.code(502).send({ error: 'Could not reach the geocoding service.' });
      }
    }
  );

  app.get<{ Querystring: { q?: string; count?: string } }>(
    '/api/stocks/search',
    async (request, reply) => {
      const query = (request.query.q ?? '').trim().slice(0, 64);
      if (!query) return { results: [] };
      const count = Math.min(Math.max(Number(request.query.count) || 8, 1), 12);
      try {
        return { results: await stocksService.search(query, count) };
      } catch (error) {
        request.log.error(error);
        return reply.code(502).send({ error: 'Could not reach the stock search service.' });
      }
    }
  );

  app.get('/api/sports/catalog', async () => sportsService.getCatalog());

  app.get<{ Params: { id: string } }>(
    '/api/sports/competitions/:id/teams',
    async (request, reply) => {
      try {
        return { teams: await sportsService.getTeams(request.params.id) };
      } catch (error) {
        request.log.error(error);
        return reply.code(502).send({ error: (error as Error).message });
      }
    }
  );
}
