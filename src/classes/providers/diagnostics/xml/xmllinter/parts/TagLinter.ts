import { Error, Linter, Tag } from "./abstraction/Linter";
import * as vscode from "vscode";
import LineColumn = require("line-column");
import { UIClassFactory } from "../../../../../UI5Classes/UIClassFactory";
import { XMLParser } from "../../../../../utils/XMLParser";
import { FileReader } from "../../../../../utils/FileReader";

interface TagValidation {
	valid: boolean;
	message?: string;
}

export class TagAttributeLinter extends Linter {
	getErrors(document: vscode.TextDocument): Error[] {
		const errors: Error[] = [];
		const documentText = document.getText();

		//check tags
		console.time("Tag linter");
		XMLParser.setCurrentDocument(documentText);

		const tags = XMLParser.getAllTags(documentText);
		tags.forEach(tag => {
			errors.push(...this._getClassNameErrors(tag));
		});

		XMLParser.setCurrentDocument(undefined);
		console.timeEnd("Tag linter");

		return errors;
	}

	private _getClassNameErrors(tag: Tag) {
		const errors: Error[] = [];

		return errors;
	}
}