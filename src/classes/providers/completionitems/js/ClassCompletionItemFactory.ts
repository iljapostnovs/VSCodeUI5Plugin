import { UIClassFactory } from "../../../UI5Classes/UIClassFactory";
import { CustomCompletionItem } from "../CustomCompletionItem";
import * as vscode from "vscode";
import { ReusableMethods } from "../../reuse/ReusableMethods";
import { FileReader } from "../../../utils/FileReader";
import { CustomUIClass } from "../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";

export class ClassCompletionItemFactory {
	static createCompletionItems(document: vscode.TextDocument) {
		let completionItems: CustomCompletionItem[] = [];
		const classes = UIClassFactory.getAllExistentUIClasses();
		const currentClassName = FileReader.getClassNameFromPath(document.fileName);
		if (currentClassName) {

			const currentUIClass = <CustomUIClass>UIClassFactory.getUIClass(currentClassName);
			const classNames = Object.keys(classes);
			const UIClasses = classNames.map(className => classes[className]).filter(UIClass => {
				return !currentUIClass.UIDefine.find(UIDefine => UIClass.className === UIDefine.classNameDotNotation);
			});
			completionItems = UIClasses.map(UIClass => {
				const classNameParts = UIClass.className.split(".");
				const shortClassName = classNameParts[classNameParts.length - 1];
				const completionItem: CustomCompletionItem = new CustomCompletionItem(shortClassName);
				completionItem.kind = vscode.CompletionItemKind.Class;
				completionItem.insertText = shortClassName;
				completionItem.detail = `${UIClass.className}`;

				const position = ReusableMethods.getPositionOfTheLastUIDefine(document);
				if (position) {
					const range = new vscode.Range(position, position);
					const classNameModulePath = `"${UIClass.className.replace(/\./g, "/")}"`;
					const insertText = currentUIClass.UIDefine.length === 0 ? `\n\t${classNameModulePath}` : `,\n\t${classNameModulePath}`;
					completionItem.additionalTextEdits = [new vscode.TextEdit(range, insertText)];
					completionItem.command = { command: "ui5plugin.moveDefineToFunctionParameters", title: "Add to UI Define" };
				}

				return completionItem;
			});
		}

		return completionItems;
	}
}