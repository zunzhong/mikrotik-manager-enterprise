import { attribute, query, tag, type RouterOsSentence } from '../codec/sentence.js';

export interface RouterOsCommandBuildOptions {
  attributes?: Record<string, string | number | boolean | undefined | null>;
  queries?: Record<string, string | number | boolean | undefined | null>;
  tag?: string;
}

export class CommandBuilder {
  public build(path: string, options: RouterOsCommandBuildOptions = {}): RouterOsSentence {
    const sentence: RouterOsSentence = [path];

    for (const [key, value] of Object.entries(options.attributes ?? {})) {
      if (value !== undefined && value !== null) sentence.push(attribute(key, value));
    }

    for (const [key, value] of Object.entries(options.queries ?? {})) {
      if (value !== undefined && value !== null) sentence.push(query(key, value));
    }

    if (options.tag) sentence.push(tag(options.tag));
    return sentence;
  }
}

export const commandBuilder = new CommandBuilder();
