import { AbstractCustomClass, ICustomClassMethod } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractCustomClass";
import { UI5Plugin } from "../../../../../../../../../../UI5Plugin";

export class Util {
	static getMethodLines(UIMethod: ICustomClassMethod) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof AbstractCustomClass && UIMethod.loc) {
			const lineEnd = UIMethod.node?.end?.line ?? UIMethod.node?.getEndLineNumber?.() ??  0;
			const lineStart = UIMethod.loc?.start?.line ?? UIMethod.node?.getStartLineNumber?.() ?? 0;

			let lines = lineEnd - lineStart - 1;
			if (lines === -1) {
				lines = 0;
			}
			return lines;
		}
	}
}