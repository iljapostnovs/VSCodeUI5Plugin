import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { UIProperty } from "../../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class Property implements IUMLGenerator, ITextLengthGettable {
	id: number;
	UIProperty: UIProperty;
	parent: ClassHead;
	constructor(UIProperty: UIProperty, parent: ClassHead) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIProperty = UIProperty;
		this.parent = parent;
	}
	getTextLength(): number {
		return `${this.UIProperty.name}: ${this.UIProperty.type}`.length;
	}
	generateXML(): string {
		const isPrivate = this.UIProperty.name.startsWith("_");
		const privateSign = isPrivate ? "-" : "+";

		return `
		<mxCell id="${this.id}" value="${privateSign} ${this.UIProperty.name}: ${this.UIProperty.type}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${this.parent.id}">
			<mxGeometry y="26" width="160" height="26" as="geometry" />
		</mxCell>`;
	}

}