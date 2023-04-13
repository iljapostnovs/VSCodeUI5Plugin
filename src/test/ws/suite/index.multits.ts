import * as glob from "glob";
import * as Mocha from "mocha";
import * as path from "path";
export function run(): Promise<void> {
	const mocha = new Mocha({
		ui: "tdd",
		timeout: "10000",
		color: true
	});

	const testsRoot = path.resolve(__dirname, "../..");

	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve, reject) => {
		try {
			const files = await glob.glob("**/**.multits.test.js", { cwd: testsRoot });
			files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

			try {
				// Run the mocha test
				mocha.run(failures => {
					if (failures > 0) {
						reject(new Error(`${failures} tests failed.`));
					} else {
						resolve();
					}
				});
			} catch (err) {
				console.error(err);
				reject(err);
			}
		} catch (error) {
			reject(error);
		}
	});
}
