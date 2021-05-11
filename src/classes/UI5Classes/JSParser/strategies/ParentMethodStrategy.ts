import { IFieldsAndMethods, UIClassFactory } from "../../UIClassFactory";
import { FieldPropertyMethodGetterStrategy } from "./abstraction/FieldPropertyMethodGetterStrategy";
import * as vscode from "vscode";
import { FileReader } from "../../../utils/FileReader";
import { CustomUIClass } from "../../UI5Parser/UIClass/CustomUIClass";
export class ParentMethodStrategy extends FieldPropertyMethodGetterStrategy {
	getFieldsAndMethods(document: vscode.TextDocument, position: vscode.Position) {
		let fieldsAndMethods: IFieldsAndMethods | undefined;
		const className = FileReader.getClassNameFromPath(document.fileName);
		const offset = document.offsetAt(position);
		if (className) {
			const UIClass = UIClassFactory.getUIClass(className);
			if (UIClass instanceof CustomUIClass && UIClass.parentClassNameDotNotation) {
				const positionAtClassBodyPropertyName = this._getIfPositionIsInPropertyName(UIClass, offset);
				if (positionAtClassBodyPropertyName) {
					const fields = UIClassFactory.getClassFields(UIClass.parentClassNameDotNotation, false);
					const methods = UIClassFactory.getClassMethods(UIClass.parentClassNameDotNotation, false);
					fieldsAndMethods = {
						className: "__override__",
						fields: fields,
						methods: methods
					};
					this._filterFieldsAndMethodsAccordingToAccessLevelModifiers(fieldsAndMethods, ["public", "protected"]);
				}
			}
		}

		return fieldsAndMethods;
	}

	private _getIfPositionIsInPropertyName(UIClass: CustomUIClass, position: number) {
		let bPositionIsInPropertyName = true;
		const positionIsBetweenProperties = !!UIClass.acornClassBody.properties?.find((node: any, index: number) => {
			let correctNode = false;
			const nextNode = UIClass.acornClassBody.properties[index + 1];
			if (nextNode && node.end < position && nextNode.start > position) {
				correctNode = true;
			}

			return correctNode;
		});

		const positionIsInPropertyKey = !!UIClass.acornClassBody.properties?.find((node: any) => {
			return node.key?.start <= position && node.key?.end >= position;
		});


		bPositionIsInPropertyName = positionIsBetweenProperties || positionIsInPropertyKey;

		return bPositionIsInPropertyName;
	}
}