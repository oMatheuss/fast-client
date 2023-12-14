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
  baseHref: string;
  endpoints: Endpoint<T>;
}

type FastClient<T> = {
  [key in keyof T]: () => void;
};

function createFastClient<T>(config: Config<T>) {
  const api: Partial<FastClient<T>> = {};

  for (let endpoint in config.endpoints) {
    const info = config.endpoints[endpoint];

    if (info.method === 'GET') {
      api[endpoint] = () => {
        console.log('INFO: called GET on ' + endpoint);
      };
    } else if (info.method === 'POST') {
      api[endpoint] = () => {
        console.log('INFO: called POST on ' + endpoint);
      };
    } else if (info.method === 'DELETE') {
      api[endpoint] = () => {
        console.log('INFO: called DELETE on ' + endpoint);
      };
    } else if (info.method === 'PUT') {
      api[endpoint] = () => {
        console.log('INFO: called PUT on ' + endpoint);
      };
    }
  }

  return api as FastClient<T>;
}

export { createFastClient };
