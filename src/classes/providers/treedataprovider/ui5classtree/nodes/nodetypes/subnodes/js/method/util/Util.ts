import {
	AbstractCustomClass,
	ICustomClassMethod
} from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import ParserBearer from "../../../../../../../../../ui5parser/ParserBearer";

export class Util extends ParserBearer {
	getMethodLines(UIMethod: ICustomClassMethod) {
		const UIClass = this._parser.classFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof AbstractCustomClass && UIMethod.loc) {
			const lineEnd = UIMethod.node?.loc?.end?.line ?? UIMethod.node?.getEndLineNumber?.() ?? 0;
			const lineStart = UIMethod.node?.loc?.start?.line ?? UIMethod.node?.getStartLineNumber?.() ?? 0;

			let lines = lineEnd - lineStart - 1;
			if (lines === -1) {
				lines = 0;
			}
			return lines;
		}
	}
}
