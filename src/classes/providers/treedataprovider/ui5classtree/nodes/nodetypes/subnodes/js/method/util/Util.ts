import LineColumn = require("line-column");
import { CustomUIClass, ICustomClassUIMethod } from "../../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../../../../../UI5Classes/UIClassFactory";

export class Util {
	static getMethodLines(UIMethod: ICustomClassUIMethod) {
		const UIClass = UIClassFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof CustomUIClass) {
			const positionBegin = LineColumn(UIClass.classText).fromIndex(UIMethod.acornNode.start);
			const positionEnd = LineColumn(UIClass.classText).fromIndex(UIMethod.acornNode.end);
			if (positionBegin && positionEnd) {
				return positionEnd.line - positionBegin.line - 1;
			}
		}
	}
}