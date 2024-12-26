import { DocumentNode, print } from 'graphql';

type GraphQLSubscriberOptions = {
  url: string;
  query: DocumentNode;
  variables?: Record<string, unknown>;
  fetchFn: typeof fetch;
};

export class GraphQLSubscriber implements AsyncIterator<unknown> {
  private static textDecoder = new TextDecoder();

  private constructor(private stream: ReadableStreamDefaultReader<Uint8Array>) {}

  public static async create(options: GraphQLSubscriberOptions): Promise<GraphQLSubscriber> {
    const { url, query, variables, fetchFn } = options;
    const response = await fetchFn(url, {
      method: 'POST',
      body: JSON.stringify({
        query: print(query),
        variables,
      }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
    });

    if (!response.body) {
      throw new Error('No response body received from server');
    }

    const reader = response.body.getReader();
    return new GraphQLSubscriber(reader);
  }

  private events: Array<{ data: unknown; errors?: { message: string }[] }> = [];
  private leftover = '';

  async next(): Promise<IteratorResult<unknown>> {
    while (true) {
      if (this.events.length > 0) {
        const { data, errors } = this.events.shift()!;
        if (errors) {
          throw new Error(errors.map((err) => err.message).join('\n\n'));
        }
        return { value: data, done: false };
      }

      const { value, done } = await this.stream.read();
      if (done) return { value: undefined, done: true };

      const decoded = GraphQLSubscriber.textDecoder.decode(value).replace(':keep-alive\n\n', '');

      if (decoded === '') continue;

      const text = `${this.leftover}${decoded}`;
      const regex = /data:.*\n\n/g;
      const matches = [...text.matchAll(regex)].flatMap((match) => match);

      matches.forEach((match) => {
        try {
          this.events.push(JSON.parse(match.replace(/^data:/, '')));
        } catch (e) {
          throw new Error(`Error parsing stream data: ${match}`);
        }
      });

      this.leftover = text.replace(matches.join(''), '');
    }
  }

  return(): Promise<IteratorResult<unknown>> {
    return Promise.resolve({ done: true, value: undefined });
  }

  [Symbol.asyncIterator](): AsyncIterator<unknown> {
    return this;
  }
}
