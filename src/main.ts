const httpMethods = ['GET', 'POST', 'PUT', 'DELETE'] as const;
type HttpMethods = typeof httpMethods;

interface EndpointInfo {
  method: HttpMethods[number];
  href: string;
}

type Endpoint<T> = {
  [key in keyof T]: EndpointInfo;
};

interface Config<T> {
  base: string;
  endpoints: Endpoint<T>;
}

type FastClient<T> = {
  [key in keyof T]: () => Promise<Response>;
};

function makeRequest<T>() {}

function createFastClient<T>(config: Config<T>) {
  const client: Partial<FastClient<T>> = {};

  for (let endpoint in config.endpoints) {
    const info = config.endpoints[endpoint];
    const url = new URL(info.href, config.base);

    if (info.method === 'GET') {
    } else if (info.method === 'POST') {
    } else if (info.method === 'DELETE') {
    } else if (info.method === 'PUT') {
    }

    client[endpoint] = () => {
      return fetch(url, { method: info.method });
    };
  }

  return client as FastClient<T>;
}

export { createFastClient };
