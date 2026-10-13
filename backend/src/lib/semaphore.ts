export class Semaphore {
  private waiters: Array<() => void> = [];
  private active = 0;

  constructor(private readonly max: number) {}

  acquire(): Promise<() => void> {
    const grant = () => {
      this.active++;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        this.active--;
        const next = this.waiters.shift();
        if (next) next();
      };
    };
    if (this.active < this.max) return Promise.resolve(grant());
    return new Promise((resolve) => this.waiters.push(() => resolve(grant())));
  }
}
