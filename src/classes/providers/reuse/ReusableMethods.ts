
import LineColumn = require("line-column");
import * as vscode from "vscode";
import { ICustomClassUIMethod, CustomUIClass } from "../../UI5Classes/UI5Parser/UIClass/CustomUIClass";

import { TextDocumentTransformer } from "../../utils/TextDocumentTransformer";
export class ReusableMethods {
	static getPositionOfTheLastUIDefine(document: vscode.TextDocument) {
		let position: vscode.Position | undefined;
		const UIClass = TextDocumentTransformer.toCustomUIClass(document);
		if (UIClass) {
			const mainFunction = UIClass.fileContent?.body[0]?.expression;
			const definePaths: any[] = mainFunction?.arguments[0]?.elements;

			let insertPosition = 0;
			if (definePaths?.length) {
				const lastDefinePath = definePaths[definePaths.length - 1];
				insertPosition = lastDefinePath.end;
			} else {
				insertPosition = mainFunction?.arguments[0]?.start;
			}

			const lineColumn = LineColumn(document.getText()).fromIndex(insertPosition);

			if (lineColumn) {
				position = new vscode.Position(lineColumn.line - 1, lineColumn.col);
			}

		}

		return position;
	}

	static getIfPositionIsInTheLastOrAfterLastMember(UIClass: CustomUIClass, position: number) {
		const currentMethod = UIClass.methods.find(method => method.acornNode?.start < position && method.acornNode?.end > position);
		const positionIsInMethod = !!currentMethod;
		const positionIsAfterLastMethod = positionIsInMethod ? false : this._getIfPositionIsAfterLastMember(UIClass, position);

		return positionIsInMethod || positionIsAfterLastMethod;
	}

	private static _getIfPositionIsAfterLastMember(UIClass: CustomUIClass, position: number) {
		let isPositionAfterLastMethod = false;
		const properties = UIClass.acornClassBody?.properties || [];
		const lastProperty = properties[properties.length - 1];
		if (lastProperty) {
			isPositionAfterLastMethod = lastProperty.end <= position && UIClass.acornClassBody.end > position;
		}

		return isPositionAfterLastMethod;
	}

	static getIfMethodIsLastOne(UIClass: CustomUIClass, method: ICustomClassUIMethod) {
		let currentMethodIsLastMethod = false;
		const propertyValues = UIClass.acornClassBody?.properties?.map((node: any) => node.value);
		if (propertyValues) {
			const methodsInClassBody = UIClass.methods.filter(method => {
				return propertyValues.includes(method.acornNode);
			});
			currentMethodIsLastMethod = methodsInClassBody.indexOf(method) === methodsInClassBody.length - 1;
		}

		return currentMethodIsLastMethod;
	}
}