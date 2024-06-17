# Fast Client

This library is intended to be a facilitator when defining which API calls you want to make.
The library behaves in a way that allows you to define all calls in one place, in a simple structure.

## How to use

Let's assume you have an API with the endpoint `/search`. First, create an instance of the FastClient:

```ts
const client = createFastClient({
  base: 'https://api.example.com',
});
```

Now you can define function your endpoints using the `client` function, and then call it:

```ts
const search = client(search: {
  method: 'GET',
  href: '/search',
});

// res: Promise<Response>
const res = search({
  query: { q: 'teste', limit: 10 },
});
```

You can also define path params using `{}` in the href:

```ts
const getUser = client({
  method: 'GET',
  href: '/user/{id}',
});
```

This will allow you to pass the id parameter in the request:

```ts
// res: Promise<Response>
// 'path' with property 'id' is required here
const res = getUser({ path: { id: 123 } });
```

### Parsers

To automatically convert the return type, just pass a parser function to the endpoint definition:

```ts
type User = { id: string; name: string };

const getUser = client({
  method: 'GET',
  href: '/user/{id}',
  parser: (res) => res.json() as Promise<User>,
});
```

For simplicity you can create a custom helper to parse json responses with types:

```ts
const asJson = <T>(res: Response) => res.json() as Promise<T>;

type User = { id: string; name: string };

const getUser = client({
  method: 'GET',
  href: '/users/{id}',
  parser: asJson<User>, // much better now
});
```

Now, when you call `getUser`, the result will parsed and the return type will be of type `Promise<User>`:

```ts
// res will be of type Promise<User>
const res = getUsers({
  query: { name: 'matheus', limit: 10, order: 'asc' },
});
```

### Middlewares

Use a middleware to define a function to intercept the request and response of all endpoints:

```ts
const client = createFastClient({
  base: 'https://api.example.com',
  async middleware(req, next) {
    // here you can modify the request
    req.headers.append('X-Application-Key', 'ABC123');

    // call next to continue the pipeline
    const res = await next(req);

    // here you can modify the response

    // return the response
    return res;
  },
});
```

This pattern can help you add `Authorization` header for each request.

### Interceptors

You can also intercept requests and responses on any endpoint you want:

```ts
const unsubscribe = client.on('response', (res) => {
  if (res.status === 401) navigate('/login');
  return res;
});
```

The function return a `unsubscribe` function for removing the event and stop it from being called. This pattern, for example, is super handy when used inside a `useEffect` in react.
