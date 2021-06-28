import { IFieldsAndMethods, UIClassFactory } from "../../UIClassFactory";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import * as vscode from "vscode";
import { FileReader } from "../../../utils/FileReader";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
import { ReusableMethods } from "../../../providers/reuse/ReusableMethods";
export class InterfaceMemberStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: vscode.TextDocument, position: vscode.Position) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = FileReader.getClassNameFromPath(document.fileName);
		const offset = document.offsetAt(position);
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.interfaces.length) {
				const positionAtClassBodyPropertyName = ReusableMethods.getIfPositionIsInPropertyName(UIClass, offset);
				if (positionAtClassBodyPropertyName) {
					const fields = UIClass.interfaces.flatMap(theInterface => UIClassFactory.getClassFields(theInterface, false));
					const methods = UIClass.interfaces.flatMap(theInterface => UIClassFactory.getClassMethods(theInterface, false));
					fieldsAndMethods = {
						className: "__interface__",
						fields: fields,
						methods: methods
					};
					this._filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods, ["public", "protected"]);
				}
			}
		}

		return fieldsAndMethods;
	}
}