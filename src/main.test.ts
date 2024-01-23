import { createFastClient, fastClient } from './main';

const api = createFastClient({
  base: 'https://google.com',
  endpoints: {
    search: {
      method: 'GET',
      href: '/',
    },
  },
});

test('get request on google should return status 200', async () => {
  const response = await api.search({ query: { q: '123' } });
  expect(response.status).toBe(200);
});
