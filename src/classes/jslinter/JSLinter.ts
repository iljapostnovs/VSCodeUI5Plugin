import { Linter } from "./parts/abstraction/Linter";
import { Error } from "./parts/abstraction/Linter";
import { WrongFieldMethodLinter } from "./parts/WrongFieldMethodLinter";
import * as vscode from "vscode";
import { WrongClassNameLinter } from "./parts/WrongClassNameLinter";
import { WrongImportLinter } from "./parts/WrongImportLinter";
import { WrongParametersLinter } from "./parts/WrongParametersLinter";

export class JSLinter {
	static getLintingErrors(document: vscode.TextDocument): Error[] {
		const linters: Linter[] = [
			new WrongFieldMethodLinter(),
			new WrongClassNameLinter(),
			new WrongImportLinter()//,
			//new WrongParametersLinter()
		];

		let errors: Error[] = [];
		try {
			linters.forEach(linter => {
				errors = errors.concat(linter.getErrors(document));
			});
		} catch (error) {
			console.error(error);
		}

		return errors;
	}
}