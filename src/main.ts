type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type ParserFunction<R> = (res: Response) => Promise<R>;

interface EndpointInfo<M extends HttpMethod, R> {
  method: M;
  href: string;
  parser?: ParserFunction<R>;
}

type EndpointResponse<T> = T extends ParserFunction<infer R> ? R : Response;

type Endpoints = {
  [K: string]: EndpointInfo<HttpMethod, unknown>;
};

interface Config<T extends Endpoints> {
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

type MethodParams = {
  GET?: { query: Record<string, string> };
  POST: { body: any; contentType?: string };
  PUT: { body: any; contentType?: string };
  DELETE?: { query: Record<string, string> };
};

type FastClient<T extends Endpoints> = {
  [K in keyof T]: (
    args: MethodParams[T[K]['method']]
  ) => Promise<EndpointResponse<T[K]['parser']>>;
};

function ensureGetFetch(config: Config<any>) {
  if (config.fetcher) return config.fetcher;
  else if (typeof fetch !== 'undefined') return fetch;
  else if (typeof window !== 'undefined') return window.fetch;
  else throw Error('ERROR: no fetcher available');
}

function isGetRequest(
  info: EndpointInfo<HttpMethod, unknown>
): info is EndpointInfo<'GET', unknown> {
  return info.method === 'GET';
}

function isDeleteRequest(
  info: EndpointInfo<HttpMethod, unknown>
): info is EndpointInfo<'DELETE', unknown> {
  return info.method === 'DELETE';
}

function isPostRequest(
  info: EndpointInfo<HttpMethod, unknown>
): info is EndpointInfo<'POST', unknown> {
  return info.method === 'POST';
}

function isPutRequest(
  info: EndpointInfo<HttpMethod, unknown>
): info is EndpointInfo<'PUT', unknown> {
  return info.method === 'PUT';
}

function createFastClient<T extends Endpoints>(config: Config<T>) {
  const _fetch = ensureGetFetch(config);
  const endpoints = config.endpoints;

  type CreatedFastClient = FastClient<typeof endpoints>;

  const client: Partial<CreatedFastClient> = {};

  for (const endpoint in endpoints) {
    const info = endpoints[endpoint];

    client[endpoint] = async (args: MethodParams[(typeof info)['method']]) => {
      const url = new URL(info.href, config.base);
      let request: Request;

      if (isGetRequest(info) || isDeleteRequest(info)) {
        const _args = args as MethodParams[(typeof info)['method']];
        if (_args) {
          for (const arg in _args.query) {
            url.searchParams.append(arg, _args.query[arg]);
          }
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

      let response: Response;

      if (typeof config.middleware !== 'undefined') {
        response = await config.middleware(request, _fetch);
      } else {
        response = await _fetch(request);
      }

      let result;

      if (typeof info.parser !== 'undefined') {
        result = await info.parser(response);
      } else {
        result = response;
      }

      return result as EndpointResponse<(typeof info)['parser']>;
    };
  }

  return client as CreatedFastClient;
}

export { createFastClient };
