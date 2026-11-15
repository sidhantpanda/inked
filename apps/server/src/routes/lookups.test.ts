import { describe, expect, it } from 'vitest';

import { testApp } from '../testing/test-app.js';

describe('Lookups API', () => {
  it('geocodes a place query for the weather picker', async () => {
    const app = await testApp();
    const response = await app.inject({ method: 'GET', url: '/api/geocode?q=Amsterdam' });
    expect(response.statusCode).toBe(200);
    const body = response.json<{ results: { name: string; latitude: number }[] }>();
    expect(body.results[0]).toMatchObject({ name: 'Amsterdam', latitude: 52.374 });

    const empty = await app.inject({ method: 'GET', url: '/api/geocode?q=' });
    expect(empty.statusCode).toBe(200);
    expect(empty.json<{ results: unknown[] }>().results).toHaveLength(0);
    await app.close();
  });

  it('searches stock symbols for the Stocks picker', async () => {
    const app = await testApp();
    const response = await app.inject({ method: 'GET', url: '/api/stocks/search?q=aapl' });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ results: { symbol: string }[] }>().results[0]).toMatchObject({
      symbol: 'AAPL'
    });

    const empty = await app.inject({ method: 'GET', url: '/api/stocks/search?q=' });
    expect(empty.json<{ results: unknown[] }>().results).toHaveLength(0);
    await app.close();
  });

  it('lists provider-neutral sports and teams', async () => {
    const app = await testApp();
    const catalog = await app.inject({ method: 'GET', url: '/api/sports/catalog' });
    expect(catalog.statusCode).toBe(200);
    expect(catalog.json<{ sports: { id: string }[] }>().sports[0]?.id).toBe('football');

    const teams = await app.inject({
      method: 'GET',
      url: '/api/sports/competitions/premier-league/teams'
    });
    expect(teams.statusCode).toBe(200);
    expect(teams.json<{ teams: { name: string }[] }>().teams[0]?.name).toBe('Arsenal');
    await app.close();
  });
});
