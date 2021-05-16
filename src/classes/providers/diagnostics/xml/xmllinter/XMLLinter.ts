import { Linter } from "./parts/abstraction/Linter";
import { TagAttributeLinter } from "./parts/TagAttributeLinter";
import { UnusedNamespaceLinter } from "./parts/UnusedNamespaceLinter";
import { IError } from "./parts/abstraction/Linter";
import * as vscode from "vscode";
import { TagLinter } from "./parts/TagLinter";
import { WrongFilePathLinter } from "./parts/WrongFilePathLinter";

export class XMLLinter {
	static getLintingErrors(document: vscode.TextDocument): IError[] {
		const linters: Linter[] = [
			new TagAttributeLinter(),
			new UnusedNamespaceLinter(),
			new TagLinter(),
			new WrongFilePathLinter()
		];

		let errors: IError[] = [];
		linters.forEach(linter => {
			errors = errors.concat(linter.getErrors(document));
		});
		// copy(JSON.stringify(errors.map(error => ({text: error.message}))))
		return errors;
	}
}