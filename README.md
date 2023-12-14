# Fast Client

This library is intended to be a facilitator when defining which API calls you want to make.
The library behaves in a way that allows you to define all calls in one place, in a simple structure.

## How to use

Let's assume you have an API with the endpoint `/api/manga`. Now you want to have a method that makes the call on this endpoint. All you need to do is:

```ts
let client = createFastClient({
  base: 'https://localhost:3000/api',
  endpoints: {
    manga: {
      href: '/manga',
      method: 'GET',
    },
  },
});

client.manga();
```

It sure seems verbose, but as your project grows, having all the calls well defined and organized will give you the full benefit of it.
