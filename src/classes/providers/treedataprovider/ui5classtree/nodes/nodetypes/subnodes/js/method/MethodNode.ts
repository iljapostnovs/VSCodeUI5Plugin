import { ICustomClassMethod } from "ui5plugin-parser/dist/classes/parsing/ui5class/AbstractCustomClass";
import { CustomJSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/js/CustomJSClass";
import { CustomTSClass } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSClass";
import { CustomTSObject } from "ui5plugin-parser/dist/classes/parsing/ui5class/ts/CustomTSObject";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import * as vscode from "vscode";
import { VSCodeLocationAdapter } from "../../../../../../../../ui5linter/adapters/VSCodeLocationAdapter";
import { ReferenceCodeLensGenerator } from "../../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { NavigatiableNode } from "../abstraction/NavigatiableNode";
import { Util } from "./util/Util";

export class MethodNode extends NavigatiableNode {
	readonly UIMethod: ICustomClassMethod;
	private readonly lines: number;
	private readonly references: number;
	constructor(UIMethod: ICustomClassMethod, parser: IUI5Parser) {
		super(parser);
		this.UIMethod = UIMethod;
		this.lines = new Util(parser).getMethodLines(this.UIMethod) || 0;
		this.references = this._getReferences();
		this.label = this._generateLabel();
		this.description = this._generateDescription();
		this.iconPath = this._generateIconPath();

		if (UIMethod.loc) {
			this._addNavigationCommand(UIMethod.owner, UIMethod.loc);
		}
	}
	private _generateIconPath() {
		let iconName = "public";

		if (this.lines > 100) {
			iconName = "private";
		} else if (
			this.lines > 50 ||
			(this.references === 0 &&
				!this._parser.classFactory.isMethodOverriden(this.UIMethod.owner, this.UIMethod.name))
		) {
			iconName = "protected";
		}

		return this._buildIconPath(`symbol-method-${iconName}.svg`);
	}

	private _getReferences() {
		const locations: VSCodeLocationAdapter[] = [];
		const referenceCodeLens = new ReferenceCodeLensGenerator(this._parser);

		const ownerClass = this._parser.classFactory.getUIClass(this.UIMethod.owner);
		if (ownerClass instanceof CustomJSClass) {
			locations.push(...referenceCodeLens.getReferenceLocations(this.UIMethod));
		} else if (ownerClass instanceof CustomTSClass || ownerClass instanceof CustomTSObject) {
			locations.push(...referenceCodeLens.getTSReferenceLocations(this.UIMethod));
		}

		return locations.length;
	}

	private _generateDescription() {
		return `(${this.UIMethod.visibility}, L: ${this.lines}, R: ${this.references}${
			this.UIMethod.isEventHandler ? ", event handler" : ""
		})`;
	}

	private _generateLabel() {
		const paramText = this.UIMethod.params
			.map((param, index) => {
				let type = param.type;
				if (this.UIMethod.isEventHandler && index === 0) {
					type = "sap.ui.base.Event";
				}
				return `${param.name}${param.isOptional ? "?" : ""}: ${type}`;
			})
			.join(", ");

		const label = `${this.UIMethod.name}(${paramText}): ${this.UIMethod.returnType}`;

		return label;
	}

	collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
}
