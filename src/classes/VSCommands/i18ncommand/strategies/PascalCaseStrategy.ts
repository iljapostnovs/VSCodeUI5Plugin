import { ITextTransformationStrategy } from "./ITextTransformationStrategy";

export class PascalCaseStrategy implements ITextTransformationStrategy {
	transform(text: string): string {
		let pascalCaseString = "";

		const stringWithLiteralCharactersOnly = text.replace(/[^a-zA-Z| ]/g, "");

		pascalCaseString = stringWithLiteralCharactersOnly.split(" ").map(stringPart => {
			const firstCharUpper = stringPart[0].toUpperCase();

			return `${firstCharUpper}${stringPart.substring(1, stringPart.length)}`;
		}).join("");

		return pascalCaseString;
	}
}