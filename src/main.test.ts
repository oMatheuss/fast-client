import { createFastClient, fastClient } from './main';

const fetcher = jest.fn((request: Request) => {
  const response = new Response('', { status: 200, headers: request.headers });
  Object.assign(response, request);
  return Promise.resolve(response);
});

const api = createFastClient({
  base: 'https://localhost:3000',
  endpoints: {
    search: {
      method: 'GET',
      href: '/',
    },
    get: {
      method: 'GET',
      href: '/{id}',
    },
  },
  fetcher,
});

test('fetch function to be called', async () => {
  await api.search({ query: { q: '123' } });
  expect(fetcher.mock.calls.length).toBe(1);

  await api.search({ query: { q: '123' } });
  expect(fetcher.mock.calls.length).toBe(2);

  await api.search({ query: { q: '123' } });
  expect(fetcher.mock.calls.length).toBe(3);
});

test('get request should return a response', async () => {
  const response = await api.search({ query: { q: '123' } });
  expect(response).toBeInstanceOf(Response);
});

test('query params should be in the url', async () => {
  const response = await api.search({
    query: { a: '123', b: '321', c: 'abc' },
  });
  expect(response.url).toBe('https://localhost:3000/?a=123&b=321&c=abc');
});

test('path params should be in the url', async () => {
  const response = await api.get({ path: { id: '123' } });
  expect(response.url).toBe('https://localhost:3000/123');
});

test('path and query params should be in the url', async () => {
  const response = await api.get({
    path: { id: '123' },
    query: { test: '321' },
  });
  expect(response.url).toBe('https://localhost:3000/123?test=321');
});

test('subscribe and unsubscribe should trigger the mock function', async () => {
  const mockFn = jest.fn((x) => x);

  const unsub = fastClient.on('request', mockFn);

  await api.search({});
  await api.search({});
  await api.search({});

  expect(mockFn.mock.calls.length).toBe(3);

  unsub();

  await api.search({});
  await api.search({});
  await api.search({});

  expect(mockFn.mock.calls.length).toBe(3);
});
