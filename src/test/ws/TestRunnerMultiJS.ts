import * as path from "path";

import { runTests } from "@vscode/test-electron";

async function main() {
	try {
		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = path.resolve(__dirname, "../../../");

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = path.resolve(__dirname, "./suite/index.multijs");
		const testWorkspace = path.resolve(__dirname, "../../../src/test/ws/project/mix/multijs");

		// Download VS Code, unzip it and run the integration test
		await runTests({ extensionDevelopmentPath, extensionTestsPath, launchArgs: [testWorkspace, "--disable-extensions"] });
	} catch (err) {
		console.error("Failed to run tests");
		process.exit(1);
	}
}

main();
