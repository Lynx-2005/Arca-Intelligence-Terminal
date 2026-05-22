"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Queue {
    constructor(opts = {}) {
        Object.defineProperty(this, "concurrency", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 1
        });
        Object.defineProperty(this, "_running", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_queue", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        if (opts.concurrency)
            this.concurrency = opts.concurrency;
    }
    runNext() {
        const job = this._queue.shift();
        if (!job)
            return;
        this._running++;
        job
            .func()
            // deno-lint-ignore no-explicit-any
            .then((result) => job.resolve(result))
            // deno-lint-ignore no-explicit-any
            .catch((error) => job.reject(error))
            .finally(() => {
            this._running--;
            this.checkQueue();
        });
    }
    checkQueue() {
        if (this._running < this.concurrency)
            this.runNext();
    }
    add(func) {
        return new Promise((resolve, reject) => {
            this._queue.push({ func, resolve, reject });
            this.checkQueue();
        });
    }
}
exports.default = Queue;
