import { Linter } from "./parts/abstraction/Linter";
import { Error } from "./parts/abstraction/Linter";
import { WrongFieldMethodLinter } from "./parts/WrongFieldMethodLinter";

export class JSLinter {
	static getLintingErrors(document: string): Error[] {
		const linters: Linter[] = [
			new WrongFieldMethodLinter()
		];

		let errors: Error[] = [];
		try {
			linters.forEach(linter => {
				errors = errors.concat(linter.getErrors(document));
			});
		} catch(error) {
			console.error(error);
		}

		return errors;
	}
}