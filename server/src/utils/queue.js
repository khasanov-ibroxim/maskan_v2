// src/utils/queue.js
class RequestQueue {
    constructor(concurrentLimit = 2, delayBetweenRequests = 2000) {
        this.queue = [];
        this.processing = [];
        this.concurrentLimit = concurrentLimit;
        this.delayBetweenRequests = delayBetweenRequests;
        this.isProcessing = false;
    }

    add(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            console.log(`📝 Navbatga qo'shildi. Jami: ${this.queue.length}`);
            this.process();
        });
    }

    async process() {
        if (this.isProcessing || this.processing.length >= this.concurrentLimit) {
            return;
        }

        const item = this.queue.shift();
        if (!item) {
            return;
        }

        this.isProcessing = true;
        this.processing.push(item);

        try {
            console.log(`⚙️ Ishlov berilmoqda... (${this.processing.length}/${this.concurrentLimit})`);
            const result = await item.task();
            item.resolve(result);
        } catch (error) {
            console.error('❌ Queue task error:', error);
            item.reject(error);
        } finally {
            this.processing = this.processing.filter(p => p !== item);

            setTimeout(() => {
                this.isProcessing = false;
                this.process();
            }, this.delayBetweenRequests);
        }
    }

    getStatus() {
        return {
            queueLength: this.queue.length,
            processing: this.processing.length,
            concurrentLimit: this.concurrentLimit
        };
    }
}

module.exports = RequestQueue;