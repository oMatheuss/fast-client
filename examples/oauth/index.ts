import { createFastClient } from 'fast-client';

interface TokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

// ideally, accessToken should be stored in memory as right now
// but the refreshToken could be stored in sessionStorage if XSS is not an issue
// or you can set it in a http cookie on the server, wich is the most recommended for web
let accessToken = '';
let refreshToken: string | null = null;
let isRefreshing = false;
let expiresDate: number | null;
let promiseToAwait: Promise<void> | null = null;

// get the date when the access_token will be expired
function getExpiresDate(expiresIn: number) {
  const date = new Date();
  date.setSeconds(date.getSeconds() + expiresIn);
  return date.getTime();
}

// you can use any api that uses oauth2 with bearer scheme
// reference for oauth: https://datatracker.ietf.org/doc/html/rfc6749
const client = createFastClient({
  base: 'http://localhost:5292',
  endpoints: {
    signin: {
      href: '/api/auth/signin',
      method: 'POST',
      parser: (res) => res.json() as Promise<TokenResponse>,
    },
    refreshToken: {
      href: '/api/auth/refresh',
      method: 'POST',
      parser: (res) => res.json() as Promise<TokenResponse>,
    },
    protected: {
      method: 'GET',
      href: '/api/protected',
    },
  },
  async middleware(req, next) {
    if (expiresDate && Date.now() > expiresDate && !isRefreshing) {
      isRefreshing = true;

      promiseToAwait = (async () => {
        console.info('refreshing token');

        const tokenResponse = await client.refreshToken({
          body: JSON.stringify({ refreshToken }),
        });

        refreshToken = tokenResponse.refreshToken;
        accessToken = tokenResponse.accessToken;
        expiresDate = getExpiresDate(tokenResponse.expiresIn);

        isRefreshing = false;
        console.info('token refreshed');
      })();
    }

    if (isRefreshing && !req.url.includes('/api/auth/refresh')) {
      console.info('awaiting refresh');
      await promiseToAwait;
    }

    req.headers.set('Authorization', `Bearer ${accessToken}`);
    const res = await next(req);
    console.log(`request to ${req.url} completed with status ${res.status}`);

    return res;
  },
});

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * running this code you should see an output like this:
 *
 * request to http://localhost:5292/api/auth/signin completed with status 200
 * request to http://localhost:5292/api/protected completed with status 200
 * request to http://localhost:5292/api/protected completed with status 200
 * request to http://localhost:5292/api/protected completed with status 200
 * refreshing token
 * awaiting refresh
 * awaiting refresh
 * awaiting refresh
 * request to http://localhost:5292/api/auth/refresh completed with status 200
 * token refreshed
 * request to http://localhost:5292/api/protected completed with status 200
 * request to http://localhost:5292/api/protected completed with status 200
 * request to http://localhost:5292/api/protected completed with status 200
 */

async function main() {
  // sign in as an authorized user
  const tokenResponse = await client.signin({
    body: JSON.stringify({
      email: 'test_email@teste.com',
      password: 'super-secure-pass',
    }),
  });

  refreshToken = tokenResponse.refreshToken;
  accessToken = tokenResponse.accessToken;
  expiresDate = getExpiresDate(tokenResponse.expiresIn);

  // shows how i can make call normally
  await Promise.all([
    client.protected({}),
    client.protected({}),
    client.protected({}),
  ]);

  // here i configured it to await for the access_token to expires
  // expiresIn is in seconds
  await delay(tokenResponse.expiresIn * 1000);

  // shows how even when the access_token expires it can handle
  // calling the refresh and do all requests
  await Promise.all([
    client.protected({}),
    client.protected({}),
    client.protected({}),
  ]);
}

main();
