type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface EndpointInfo<M extends HttpMethod> {
  readonly method: M;
  href: string;
}

type EndpointsWithoutTypes = {
  [K: string]: EndpointInfo<HttpMethod>;
};

type Endpoints<T> = {
  [K in keyof T]: T[K] extends EndpointInfo<infer M> ? EndpointInfo<M> : never;
};

type MethodParams = {
  GET: { query: Record<string, string> };
  POST: { body: any; contentType?: string };
  PUT: { body: any; contentType?: string };
  DELETE: { query: Record<string, string> };
};

interface Config<T extends EndpointsWithoutTypes> {
  /***
   * the base URL of the API
   */
  base: string;

  /***
   * endpoints to be called later
   */
  endpoints: T;

  /***
   * middleware serves as a request and response interceptor
   */
  middleware?: (
    req: Request,
    next: (req: Request) => Promise<Response>
  ) => Promise<Response>;

  /***
   * the handler that will make the http requests
   */
  fetcher?: (request: Request) => Promise<Response>;
}

type FastClient<T> = {
  [K in keyof T]: (
    args?: MethodParams[Endpoints<T>[K]['method']]
  ) => Promise<Response>;
};

function ensureGetFetch(config: Config<any>) {
  if (config.fetcher) return config.fetcher;
  else if (typeof fetch !== 'undefined') return fetch;
  else if (typeof window !== 'undefined') return window.fetch;
  else throw Error('ERROR: no fetcher available');
}

function isGetRequest(
  info: EndpointInfo<HttpMethod>
): info is EndpointInfo<'GET'> {
  return info.method === 'GET';
}

function isDeleteRequest(
  info: EndpointInfo<HttpMethod>
): info is EndpointInfo<'DELETE'> {
  return info.method === 'DELETE';
}

function isPostRequest(
  info: EndpointInfo<HttpMethod>
): info is EndpointInfo<'POST'> {
  return info.method === 'POST';
}

function isPutRequest(
  info: EndpointInfo<HttpMethod>
): info is EndpointInfo<'PUT'> {
  return info.method === 'PUT';
}

function createFastClient<T extends EndpointsWithoutTypes>(config: Config<T>) {
  const _fetch = ensureGetFetch(config);
  const endpoints = config.endpoints as unknown as Endpoints<T>;

  type CreatedFastClient = FastClient<typeof endpoints>;

  const client: Partial<CreatedFastClient> = {};

  for (const endpoint in endpoints) {
    const info = endpoints[endpoint];
    const url = new URL(info.href, config.base);

    type FnArgs = MethodParams[(typeof info)['method']];

    client[endpoint] = (args?: FnArgs) => {
      let request: Request;

      if (isGetRequest(info) || isDeleteRequest(info)) {
        const _args = args as MethodParams[typeof info.method];
        for (const arg in _args.query) {
          url.searchParams.append(arg, _args.query[arg]);
        }

        request = new Request(url, { method: info.method });
      } else if (isPostRequest(info) || isPutRequest(info)) {
        const _args = args as MethodParams[typeof info.method];

        const headers = new Headers();
        if (_args.contentType)
          headers.append('Content-Type', _args.contentType);
        else headers.append('Content-Type', 'application/json');

        request = new Request(url, {
          method: info.method,
          body: _args.body,
          headers,
        });
      } else {
        throw new Error('Method not implemented');
      }

      if (typeof config.middleware !== 'undefined') {
        const _middleware = config.middleware;
        return _middleware(request, _fetch);
      }

      return _fetch(request);
    };
  }

  return client as CreatedFastClient;
}

export { createFastClient };
