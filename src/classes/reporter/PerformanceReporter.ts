export class PerformanceReporter {
	private static reportMap: {[key: string]: any} = {};
	static report(type: string, time: number) {
		if (!this.reportMap[type]) {
			this.reportMap[type] = 0;
		}
		this.reportMap[type] += time;
	}

	static display() {
		for (const i in this.reportMap) {
			console.log(`${i}: ${this.reportMap[i]}ms`);
		}
		this.reportMap = {};
	}
}