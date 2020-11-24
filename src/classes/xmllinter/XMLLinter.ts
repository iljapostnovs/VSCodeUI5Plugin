import { Linter } from "./parts/abstraction/Linter";
import { TagAttributeLinter } from "./parts/TagAttributeLinter";
import { UnusedNamespaceLinter } from "./parts/UnusedNamespaceLinter";
import { Error } from "./parts/abstraction/Linter";

export class XMLLinter {
	static getLintingErrors(document: string): Error[] {
		const linters: Linter[] = [
			new TagAttributeLinter(),
			new UnusedNamespaceLinter()
		];

		const errors: Error[] = linters.reduce((accumulator: Error[], linter) => {
			const errors = linter.getErrors(document);
			accumulator = accumulator.concat(errors);

			return accumulator;
		}, []);

		return errors;
	}


}