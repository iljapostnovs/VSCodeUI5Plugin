import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { UIField } from "../../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class Field implements IUMLGenerator, ITextLengthGettable {
	id: number;
	UIField: UIField;
	parent: ClassHead;
	constructor(UIField: UIField, parent: ClassHead) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIField = UIField;
		this.parent = parent;
	}
	getTextLength(): number {
		return this.getValue().length;
	}

	getValue() {
		const isPrivate = this.UIField.name.startsWith("_");
		const privateSign = isPrivate ? "-" : "+";
		const value = `${privateSign} ${this.UIField.name}: ${this.UIField.type?.replace("__map__", "map") || "any"}`;

		return value.replace(/\"/g, "").replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
	}
	generateXML(): string {
		return `
		<mxCell id="${this.id}" value="${this.getValue()}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${this.parent.id}">
			<mxGeometry y="26" width="160" height="26" as="geometry" />
		</mxCell>`;
	}
}