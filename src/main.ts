const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethods = (typeof httpMethods)[number];

interface EndpointInfo {
  method: HttpMethods;
  href: string;
}

type Endpoint<T> = {
  [key in keyof T]: EndpointInfo;
};

interface Config<T> {
  base: string;
  endpoints: Endpoint<T>;
  middleware?: (
    req: Request,
    next: (req: Request) => Promise<Response>
  ) => Promise<Response>;
  fetcher?: (request: Request) => Promise<Response>;
}

type FastClient<T, U extends Config<T>> = {
  [K in keyof U['endpoints']]: () => Promise<Response>;
};

function createFastClient<T>(config: Config<T>) {
  if (
    !config.fetcher &&
    typeof fetch === 'undefined' &&
    typeof window === 'undefined'
  ) {
    throw Error('ERROR: no fetcher available');
  }

  const _fetch = config.fetcher ?? fetch ?? window.fetch;

  const client: Partial<FastClient<T, typeof config>> = {};

  for (let endpoint in config.endpoints) {
    const info = config.endpoints[endpoint];
    const url = new URL(info.href, config.base);
    if (typeof config.middleware !== 'undefined') {
      const _middleware = config.middleware;
      client[endpoint] = () => {
        const request = new Request(url, { method: info.method });
        return _middleware(request, _fetch);
      };
    } else {
      client[endpoint] = () => {
        const request = new Request(url, { method: info.method });
        return _fetch(request);
      };
    }
  }

  return client as FastClient<T, typeof config>;
}

export { createFastClient };
