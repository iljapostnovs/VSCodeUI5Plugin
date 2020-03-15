import { ITextTransformationStrategy } from "./ITextTransformationStrategy";

export class SnakeUpperCase implements ITextTransformationStrategy {
	transform(text: string): string {
		let snakeUpperCaseString = "";

		const stringWithLiteralCharactersOnly = text.replace(/[^a-zA-Z| ]/g, "");

		snakeUpperCaseString = stringWithLiteralCharactersOnly.split(" ").map(stringPart => stringPart.toUpperCase()).join("_");

		return snakeUpperCaseString;
	}
}