import { randomUUID } from 'node:crypto';

import type { FastifyInstance } from 'fastify';

import type { AppServices } from './context.js';

/** Google account connection (OAuth) and calendar listing for the Calendar widget. */
export function registerGoogleRoutes(app: FastifyInstance, { calendarService }: AppServices) {
  const pendingOAuthStates = new Set<string>();

  app.get('/api/google/status', async () => ({ configured: calendarService.isConfigured() }));

  app.get('/api/google/auth', async (request, reply) => {
    if (!calendarService.isConfigured()) {
      return reply.code(400).send({ error: 'Google OAuth is not configured on the server.' });
    }
    const state = randomUUID();
    pendingOAuthStates.add(state);
    setTimeout(() => pendingOAuthStates.delete(state), 10 * 60 * 1000).unref();
    return reply.redirect(calendarService.getAuthUrl(state));
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/api/google/callback',
    async (request, reply) => {
      const { code, state, error } = request.query;
      const closePage = (message: string, ok: boolean) =>
        reply.type('text/html').send(
          `<!doctype html><meta charset="utf-8"><body style="font:14px system-ui;padding:24px;color:#18211c">
             <p>${message}</p>
             <script>
               try { window.opener && window.opener.postMessage({ type: 'inked-google', ok: ${String(ok)} }, '*'); } catch (e) {}
               setTimeout(function () { window.close(); }, 400);
             </script>
           </body>`
        );

      if (error) return closePage(`Google sign-in was cancelled (${error}).`, false);
      if (!code || !state || !pendingOAuthStates.delete(state)) {
        return closePage('Sign-in link expired or was invalid. Please try again.', false);
      }
      try {
        const account = await calendarService.handleCallback(code);
        return closePage(`Connected ${account.email}. You can close this window.`, true);
      } catch (callbackError) {
        request.log.error(callbackError);
        return closePage('Could not connect the Google account. Please try again.', false);
      }
    }
  );

  app.get('/api/google/accounts', async () => ({ accounts: await calendarService.listAccounts() }));

  app.delete<{ Params: { id: string } }>('/api/google/accounts/:id', async (request) => {
    await calendarService.removeAccount(request.params.id);
    return { accounts: await calendarService.listAccounts() };
  });

  app.get<{ Params: { id: string } }>(
    '/api/google/accounts/:id/calendars',
    async (request, reply) => {
      try {
        return { calendars: await calendarService.listCalendars(request.params.id) };
      } catch (error) {
        request.log.error(error);
        return reply.code(502).send({ error: 'Could not load calendars for this account.' });
      }
    }
  );
}
