type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface EndpointInfo {
  method: HttpMethod;
  href: string;
}

type Endpoints<T> = {
  [K in keyof T]: EndpointInfo; // need types <'GET'>, <'POST'> ...
};

interface Config<T> {
  base: string;
  endpoints: Endpoints<T>;
  middleware?: (
    req: Request,
    next: (req: Request) => Promise<Response>
  ) => Promise<Response>;
  fetcher?: (request: Request) => Promise<Response>;
}

type FastClient<T, U extends Config<T>> = {
  [K in keyof U['endpoints']]: (args: U['endpoints'][K]) => Promise<Response>;
};

function createFastClient<T>(config: Config<T>): FastClient<T, typeof config> {
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
