import * as vscode from "vscode";
import { ES5Strategy } from "./abstraction/ES5Strategy";
import { ES6Strategy } from "./abstraction/ES6Strategy";
import { ESBase } from "./abstraction/ESBase";
enum CodeGenerationStrategies {
	ES5 = "ES5",
	ES6 = "ES6"
}
export class CodeGeneratorFactory {
	static createStrategy(): ESBase {
		const codeGenerationStrategyType = vscode.workspace.getConfiguration("ui5.plugin").get("codeGeneratorStrategy");
		if (codeGenerationStrategyType === CodeGenerationStrategies.ES5) {
			return new ES5Strategy();
		} else {
			return new ES6Strategy();
		}
	}

	static createTSStrategy(): ESBase {
		return new ES6Strategy();
	}
}