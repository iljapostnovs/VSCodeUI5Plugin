import * as Mocha from "mocha";
import * as path from "path";
import { glob } from "ui5plugin-parser/dist/glob";
export function run(testsRoot: string, testPath: string): Promise<void> {
	const mocha = new Mocha({
		ui: "tdd",
		timeout: "10000",
		color: true
	});

	// eslint-disable-next-line no-async-promise-executor
	return new Promise(async (resolve, reject) => {
		try {
			const files = await glob.glob(testPath, { cwd: testsRoot });
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
