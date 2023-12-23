# Fast Client

This library is intended to be a facilitator when defining which API calls you want to make.
The library behaves in a way that allows you to define all calls in one place, in a simple structure.

## How to use

Let's assume you have an API with the endpoint `/api/manga`. Now you want to have a method that makes the call on this endpoint. All you need to do is:

```ts
const client = createFastClient({
  base: 'https://api.mangadex.org',
  endpoints: {
    getMangas: {
      method: 'GET',
      href: '/manga',
    },
    postManga: {
      method: 'POST',
      href: '/manga',
    },
  },
  middleware(req, next) {
    req.headers.append('X-Application-Key', 'ABC123');
    return next(req);
  },
});

const r1 = client.getMangas({
  query: { title: 'One Piece', limit: '10' },
});

const r2 = client.postManga({
  body: JSON.stringify({ title: 'One Piece', author: 'Oda Eiichiro' }),
  contentType: 'application/json', // default
});
```

It sure seems verbose, but as your project grows, having all the calls well defined and organized will give you the full benefit of it.
