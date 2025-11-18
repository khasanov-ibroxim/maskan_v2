class RequestQueue {
    constructor(concurrentLimit = 2, delayBetweenRequests = 2000) {
        this.queue = [];
        this.processing = 0;
        this.concurrentLimit = concurrentLimit;
        this.delayBetweenRequests = delayBetweenRequests;
        this.totalProcessed = 0;
        this.totalFailed = 0;
    }

    async add(taskFunction) {
        return new Promise((resolve, reject) => {
            this.queue.push({
                task: taskFunction,
                resolve,
                reject,
                addedAt: Date.now()
            });

            console.log(`📋 Navbatga qo'shildi. Navbatda: ${this.queue.length}, Jarayonda: ${this.processing}`);
            this.process();
        });
    }

    async process() {
        if (this.processing >= this.concurrentLimit || this.queue.length === 0) {
            return;
        }

        this.processing++;
        const item = this.queue.shift();

        const waitTime = ((Date.now() - item.addedAt) / 1000).toFixed(1);
        console.log(`\n▶️ Zapros bajarilmoqda (${waitTime}s kutdi). Qolgan: ${this.queue.length}`);

        try {
            const result = await item.task();
            this.totalProcessed++;
            console.log(`✅ Zapros bajarildi! Jami: ${this.totalProcessed}, Xato: ${this.totalFailed}`);
            item.resolve(result);
        } catch (error) {
            this.totalFailed++;
            console.error(`❌ Zapros xatosi: ${error.message}`);
            item.reject(error);
        } finally {
            this.processing--;

            if (this.queue.length > 0) {
                console.log(`⏳ ${this.delayBetweenRequests}ms kutish...`);
                setTimeout(() => this.process(), this.delayBetweenRequests);
            } else {
                console.log(`✅ Navbat bo'sh. Bajarildi: ${this.totalProcessed}, Xato: ${this.totalFailed}`);
            }
        }
    }

    getStatus() {
        return {
            queueLength: this.queue.length,
            processing: this.processing,
            totalProcessed: this.totalProcessed,
            totalFailed: this.totalFailed
        };
    }
}

module.exports = RequestQueue;