import * as vscode from "vscode";
import { ICustomClassUIMethod } from "../../../../../../../UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { NavigatiableNode } from "../abstraction/NavigatiableNode";
import * as path from "path";
import { ReferenceCodeLensGenerator } from "../../../../../../codelens/jscodelens/strategies/ReferenceCodeLensGenerator";
import { Util } from "./util/Util";
import { UIClassFactory } from "../../../../../../../UI5Classes/UIClassFactory";


export class MethodNode extends NavigatiableNode {
	readonly UIMethod: ICustomClassUIMethod;
	private readonly lines: number;
	private readonly references: number;
	constructor(UIMethod: ICustomClassUIMethod) {
		super();
		this.UIMethod = UIMethod;
		this.lines = Util.getMethodLines(this.UIMethod) || 0;
		this.references = this._getReferences();
		this.label = this._generateLabel();
		this.description = this._generateDescription();
		this.iconPath = this._generateIconPath();

		if (UIMethod.memberPropertyNode) {
			this._addNavigationCommand(UIMethod.owner, UIMethod.memberPropertyNode.start, UIMethod.memberPropertyNode.end);
		}
	}
	private _generateIconPath() {
		let iconName = "public";

		if (this.lines > 100) {
			iconName = "private";
		} else if (this.lines > 50 || (this.references === 0 && !UIClassFactory.isMethodOverriden(this.UIMethod.owner, this.UIMethod.name))) {
			iconName = "protected";
		}

		return path.join(__filename, "..", "..", "..", "..", "..", "..", "..", "..", "..", "..", "icons", `symbol-method-${iconName}.svg`);
	}

	private _getReferences() {
		const referenceCodeLens = new ReferenceCodeLensGenerator();
		const locations = referenceCodeLens.getReferenceLocations(this.UIMethod);
		return locations.length;
	}

	private _generateDescription() {
		return `(${this.UIMethod.visibility}, L: ${this.lines}, R: ${this.references}${this.UIMethod.isEventHandler ? ", event handler" : ""})`;
	}

	private _generateLabel() {
		const paramText = this.UIMethod.params.map((param, index) => {
			let type = param.type;
			if (this.UIMethod.isEventHandler && index === 0) {
				type = "sap.ui.base.Event";
			}
			return `${param.name}${param.isOptional ? "?" : ""}: ${type}`
		}).join(", ");

		const label = `${this.UIMethod.name}(${paramText}): ${this.UIMethod.returnType}`;

		return label;
	}

	collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
}