export class TagGenerator {
  private counter = 0;

  public next(prefix = 'mme'): string {
    this.counter += 1;
    return `${prefix}-${Date.now()}-${this.counter}`;
  }
}

export const tagGenerator = new TagGenerator();
