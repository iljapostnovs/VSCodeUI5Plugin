import { ICustomClassUIMethod, CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UI5Plugin } from "../../../../../../../../../../UI5Plugin";

export class Util {
	static getMethodLines(UIMethod: ICustomClassUIMethod) {
		const UIClass = UI5Plugin.getInstance().parser.classFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof CustomUIClass && UIMethod.acornNode) {
			let lines = UIMethod.acornNode.loc.end.line - UIMethod.acornNode.loc.start.line - 1;
			if (lines === -1) {
				lines = 0;
			}
			return lines;
		}
	}
}