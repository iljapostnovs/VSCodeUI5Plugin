export class EndlessLoopLocker {
	private static timeStart = new Date();

	static beginProcess() {
		this.timeStart = new Date();
	}

	static checkForTimeout() {
		//workaround class which is my backup for endless loops
		//hopefully will be removed as soon as all endless loop situations
		//will be resolved
		const currentTime = new Date().getTime();
		const timeStart = this.timeStart.getTime();
		const threeSeconds = 3 * 1000;

		if (currentTime - timeStart > threeSeconds) {
			// throw new Error("Exceeded execution time limit");
		}
	}
}