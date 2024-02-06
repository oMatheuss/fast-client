type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type ParserFunction<R> = (res: Response) => Promise<R>;

interface EndpointInfo<T extends string> {
  method: HttpMethod;
  href: T;
  parser?: ParserFunction<unknown>;
}

type Endpoints<T extends string> = { [K: string]: EndpointInfo<T> };

interface Config<T extends Endpoints<string>> {
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
  GET: { query?: Record<string, string> };
  HEAD: { query?: Record<string, string> };
  POST: { body: any; contentType?: string };
  PUT: { body: any; contentType?: string };
  DELETE: { query?: Record<string, string> };
  PATCH: { body: any; contentType?: string };
};

type RecursiveParamMatcher<T extends string> =
  T extends `${infer Token}/${infer Rest}`
    ? Token extends `{${infer Param}}`
      ? Param | RecursiveParamMatcher<Rest>
      : RecursiveParamMatcher<Rest>
    : T extends `{${infer Param}}`
      ? Param
      : never;

type PathParams<T> = T extends `/${infer Path}`
  ? DropEmpty<{ path: { [K in RecursiveParamMatcher<Path>]: string } }>
  : { path?: Record<string, string> };

type EndpointResponse<T> = T extends ParserFunction<infer R> ? R : Response;

type DropEmpty<T> = {
  [K in keyof T as keyof T[K] extends never ? never : K]: T[K];
};

type Identity<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

type FastClient<T extends Endpoints<string>> = {
  [K in keyof T]: (
    args: Identity<MethodParams[T[K]['method']] & PathParams<T[K]['href']>>
  ) => Promise<EndpointResponse<T[K]['parser']>>;
};

function ensureGetFetch(config: Config<any>) {
  if (config.fetcher) return config.fetcher;
  else if (typeof fetch !== 'undefined') return fetch;
  else if (typeof window !== 'undefined') return window.fetch;
  else throw Error('ERROR: no fetcher available');
}

type FastClientEvent = 'request' | 'response';
type Unsubscribe = () => void;
type EventHandler = {
  request: (request: Request) => Request | Promise<Request>;
  response: (response: Response) => Response | Promise<Response>;
};

interface IGlobalFastClient {
  create<U extends string, T extends Endpoints<U>>(
    config: Config<T>
  ): FastClient<T>;
  on<T extends FastClientEvent>(
    eventType: T,
    handler: EventHandler[T]
  ): Unsubscribe;
}

type Handlers =
  | {
      eventType: 'request';
      handler: EventHandler['request'];
    }
  | {
      eventType: 'response';
      handler: EventHandler['response'];
    };

class GlobalFastClient implements IGlobalFastClient {
  private handlers: Array<Handlers>;
  constructor() {
    this.handlers = [];
  }
  create<U extends string, T extends Endpoints<U>>(
    config: Config<T>
  ): FastClient<T> {
    const _fetch = ensureGetFetch(config);
    const endpoints = config.endpoints;

    type CreatedFastClient = FastClient<typeof endpoints>;

    const client: Partial<CreatedFastClient> = {};

    const nextFn = async (request: Request) => {
      for (const handler of this.handlers) {
        if (handler.eventType === 'request') {
          request = await handler.handler(request);
        }
      }

      let response = await _fetch(request);

      for (const handler of this.handlers) {
        if (handler.eventType === 'response') {
          response = await handler.handler(response);
        }
      }

      return response;
    };

    for (const endpoint in endpoints) {
      const info = endpoints[endpoint];

      client[endpoint] = async (args) => {
        let href = info.href as string;

        if (args && 'path' in args) {
          const path = args.path as Record<string, string>;
          for (const param in path) {
            href = href.replace(`{${param}}`, path[param]);
          }
        }

        const url = new URL(href, config.base);
        const headers = new Headers();

        if (args) {
          if ('query' in args) {
            for (const arg in args.query) {
              url.searchParams.append(arg, args.query[arg]);
            }
          }

          if (info.method === 'POST' || info.method === 'PUT') {
            if ('contentType' in args && args.contentType)
              headers.append('Content-Type', args.contentType);
            else headers.append('Content-Type', 'application/json');
          }
        }

        let request = new Request(url, {
          method: info.method,
          body: args && 'body' in args && args.body ? args.body : null,
          headers,
        });

        let response: Response;

        if (config.middleware) {
          response = await config.middleware(request, nextFn);
        } else {
          response = await nextFn(request);
        }

        let result;

        if (info.parser) {
          result = await info.parser(response);
        } else {
          result = response;
        }

        return result as EndpointResponse<(typeof info)['parser']>;
      };
    }

    return client as CreatedFastClient;
  }
  on<T extends FastClientEvent>(
    eventType: T,
    handler: EventHandler[T]
  ): Unsubscribe {
    // TODO: fix types
    this.handlers.push({ eventType, handler } as any);

    return () => {
      this.handlers = this.handlers.filter((x) => x.handler !== handler);
    };
  }
}

const fastClient = new GlobalFastClient();

function createFastClient<U extends string, T extends Endpoints<U>>(
  config: Config<T>
) {
  return fastClient.create(config);
}

export { createFastClient, fastClient, GlobalFastClient };
