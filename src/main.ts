type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type ParserFunction<R> = (res: Response) => Promise<R>;

interface EndpointInfo<T extends string> {
  /**
   * The request method.
   */
  method: HttpMethod;

  /**
   * The HREF relative path from base.
   */
  href: T;

  /**
   * For automatic parsing the response. \
   * The return type will be inferred from this function if any.
   */
  parser?: ParserFunction<unknown>;
}

interface Config {
  /**
   * The base URL of the API to consume.
   */
  base: string;

  /**
   *
   * The middleware serves as a request and response interceptor.
   */
  middleware?: (
    req: Request,
    next: (req: Request) => Promise<Response>
  ) => Promise<Response>;

  /**
   * The handler that will make the http requests.
   */
  fetcher?: (request: Request) => Promise<Response>;
}

type QueryParamType = string | number | boolean;

interface RequestParams extends Omit<RequestInit, 'method'> {
  query?: Record<string, QueryParamType>;
}

type RecursiveParamMatcher<T extends string> =
  T extends `${infer Token}/${infer Rest}`
    ? Token extends `{${infer Param}}`
      ? Param | RecursiveParamMatcher<Rest>
      : RecursiveParamMatcher<Rest>
    : T extends `{${infer Param}}`
      ? Param
      : never;

type PathParamType = string | number | boolean;

type PathParams<T> = T extends `${infer Path}`
  ? DropEmpty<{ path: { [K in RecursiveParamMatcher<Path>]: PathParamType } }>
  : { path?: Record<string, PathParamType> };

type DropEmpty<T> = {
  [K in keyof T as keyof T[K] extends never ? never : K]: T[K];
};

type Identity<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

function ensureGetFetch(config: Config) {
  if (config.fetcher) return config.fetcher; // httpclient from config
  else if (typeof fetch !== 'undefined') return fetch; // httpclient from node
  else if (typeof window !== 'undefined')
    return window.fetch; // httpclient from browser
  else throw Error('ERROR: no fetcher available');
}

type FetcherFn<U extends string, T extends EndpointInfo<U>> = (
  args: Identity<RequestParams & PathParams<T['href']>>
) => Promise<EndpointResponse<T['parser']>>;

type FastClientEvent = 'request' | 'response';
type EventHandlerFn = {
  request: (request: Request) => Request | Promise<Request>;
  response: (response: Response) => Response | Promise<Response>;
};

type Handlers =
  | {
      eventType: 'request';
      handler: EventHandlerFn['request'];
    }
  | {
      eventType: 'response';
      handler: EventHandlerFn['response'];
    };

type EndpointInfoRecord<T extends string> = Record<string, EndpointInfo<T>>;
type FetchersFns<U extends string, T extends EndpointInfoRecord<U>> = {
  [K in keyof T]: FetcherFn<U, T[K]>;
};

type EndpointResponse<T> = T extends ParserFunction<infer R> ? R : Response;

interface FastClient {
  /**
   * Create an endpoint binded to this FastClient instance.
   */
  <U extends string, T extends EndpointInfo<U>>(info: T): FetcherFn<U, T>;

  /**
   * Bind an event to this FastClient instance.
   */
  on<T extends FastClientEvent>(
    eventType: T,
    handler: EventHandlerFn[T]
  ): () => void;

  /**
   * Create many endpoints binded to this FastClient instance.
   */
  many<U extends string, T extends EndpointInfoRecord<U>>(
    endpoints: T
  ): FetchersFns<U, T>;
}

export function createFastClient(config: Config): FastClient {
  const _fetch = ensureGetFetch(config);
  let _handlers: Handlers[] = [];

  async function nextFn(request: Request) {
    for (const { eventType, handler } of _handlers) {
      if (eventType === 'request') request = await handler(request);
    }

    let response = await _fetch(request);

    for (const { eventType, handler } of _handlers) {
      if (eventType === 'response') response = await handler(response);
    }

    return response;
  }

  const fastClient = function <T extends EndpointInfo<string>>(info: T) {
    return async function (
      args: Identity<RequestParams & PathParams<T['href']>>
    ) {
      const { path, query, headers: headersInit, ...requestInit } = args;

      let href = info.href as string;
      if (path) {
        for (const param in path) {
          href = href.replace(`{${param}}`, path[param].toString());
        }
      }

      const url = new URL(href, config.base);
      const headers = new Headers(headersInit);

      if (args) {
        if (query) {
          for (const [key, value] of Object.entries(query)) {
            if (value) url.searchParams.append(key, value.toString());
          }
        }

        if (
          info.method === 'POST' ||
          info.method === 'PUT' ||
          info.method === 'PATCH'
        ) {
          if (headers.get('Content-Type') === null)
            headers.append('Content-Type', 'application/json');
        }
      }

      const request = new Request(url, {
        method: info.method,
        headers,
        ...requestInit,
      });

      const response = config.middleware
        ? await config.middleware(request, nextFn)
        : await nextFn(request);

      const result = info.parser ? info.parser(response) : response;

      return result as EndpointResponse<T['parser']>;
    };
  };

  fastClient.on = function <T extends FastClientEvent>(
    eventType: T,
    handler: EventHandlerFn[T]
  ) {
    _handlers.push({ eventType, handler } as Handlers);

    return function () {
      _handlers = _handlers.filter((x) => x.handler !== handler);
    };
  };

  fastClient.many = function <
    U extends string,
    T extends EndpointInfoRecord<U>,
  >(endpoints: T) {
    const entries = Object.entries(endpoints);
    const outputs = [];
    for (const [key, value] of entries) {
      outputs.push([key, fastClient(value)] as const);
    }
    return Object.fromEntries(outputs) as FetchersFns<U, T>;
  };

  return fastClient;
}
