import { CustomUIClass, ICustomClassUIMethod } from "../../../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UIClassFactory } from "../../../../../../../../../UI5Classes/UIClassFactory";

export class Util {
	static getMethodLines(UIMethod: ICustomClassUIMethod) {
		const UIClass = UIClassFactory.getUIClass(UIMethod.owner);
		if (UIClass instanceof CustomUIClass && UIMethod.acornNode) {
			let lines = UIMethod.acornNode.loc.end.line - UIMethod.acornNode.loc.start.line - 1;
			if (lines === -1) {
				lines = 0;
			}
			return lines;
		}
	}
}