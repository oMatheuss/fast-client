import { createFastClient } from './main';

const fetcher = jest.fn((request: Request) => {
  const response = new Response('', { status: 200, headers: request.headers });
  Object.assign(response, request);
  return Promise.resolve(response);
});

const api = createFastClient({
  base: 'https://localhost:3000',
  fetcher,
});

const search = api({
  method: 'GET',
  href: '/',
});

const get = api({
  method: 'GET',
  href: '/{id}',
});

test('fetch function to be called', async () => {
  await search({ query: { q: '123' } });
  expect(fetcher.mock.calls.length).toBe(1);

  await search({ query: { q: '123' } });
  expect(fetcher.mock.calls.length).toBe(2);

  await search({ query: { q: '123' } });
  expect(fetcher.mock.calls.length).toBe(3);
});

test('get request should return a response', async () => {
  const response = await search({ query: { q: '123' } });
  expect(response).toBeInstanceOf(Response);
});

test('query params should be in the url', async () => {
  const response = await search({
    query: { a: 123, b: true, c: 'abc' },
  });
  expect(response.url).toBe('https://localhost:3000/?a=123&b=true&c=abc');
});

test('path params should be in the url', async () => {
  const response = await get({ path: { id: 123 } });
  expect(response.url).toBe('https://localhost:3000/123');
});

test('path and query params should be in the url', async () => {
  const response = await get({
    path: { id: '123' },
    query: { test: 321 },
  });
  expect(response.url).toBe('https://localhost:3000/123?test=321');
});

test('subscribe and unsubscribe should trigger the mock function', async () => {
  const mockFn = jest.fn((x) => x);

  const unsub = api.on('request', mockFn);

  await search({});
  await search({});
  await search({});

  expect(mockFn.mock.calls.length).toBe(3);

  unsub();

  await search({});
  await search({});
  await search({});

  expect(mockFn.mock.calls.length).toBe(3);
});
