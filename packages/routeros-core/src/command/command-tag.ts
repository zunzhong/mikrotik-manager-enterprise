export class CommandTagGenerator {
  private counter = 0;

  public next(): string {
    this.counter += 1;
    return `req-${this.counter}`;
  }
}
