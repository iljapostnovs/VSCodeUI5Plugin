import * as vscode from "vscode";
import { PascalCaseStrategy } from "./strategies/PascalCaseStrategy";
import { ITextTransformationStrategy } from "./strategies/ITextTransformationStrategy";
import { SnakeUpperCase } from "./strategies/SnakeUpperCase";

export enum CaseType {
	PascalCase = "Pascal Case",
	SnakeUpperCase = "Snake Upper Case"
}
export class TextTransformationFactory {
	static createTextTransformationStrategy() {
		let strategy: ITextTransformationStrategy;
		const textTransformationStrategy = vscode.workspace.getConfiguration("ui5.plugin").get("textTransformationStrategy");
		if (textTransformationStrategy === CaseType.PascalCase) {
			strategy = new PascalCaseStrategy();
		} else if (textTransformationStrategy === CaseType.SnakeUpperCase) {
			strategy = new SnakeUpperCase();
		} else {
			strategy = new PascalCaseStrategy();
		}

		return strategy;
	}
}