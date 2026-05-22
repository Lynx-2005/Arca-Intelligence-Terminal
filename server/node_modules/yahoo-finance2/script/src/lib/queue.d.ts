interface Job {
    func: () => Promise<unknown>;
    resolve: (arg: any) => void;
    reject: (arg: any) => void;
}
export interface QueueOptions {
    _queue?: Queue;
    /** Max number of simultaneous network requests */
    concurrency?: number;
}
export default class Queue {
    concurrency: number;
    _running: number;
    _queue: Array<Job>;
    constructor(opts?: QueueOptions);
    runNext(): void;
    checkQueue(): void;
    add(func: () => Promise<unknown>): Promise<unknown>;
}
export {};
//# sourceMappingURL=queue.d.ts.map