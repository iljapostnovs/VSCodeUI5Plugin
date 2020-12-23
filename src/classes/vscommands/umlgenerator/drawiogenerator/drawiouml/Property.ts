import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { UIProperty } from "../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class Property implements IUMLGenerator, ITextLengthGettable {
	id: number;
	UIProperty: UIProperty;
	parent: ClassHead;
	index: number;
	constructor(UIProperty: UIProperty, parent: ClassHead, index: number) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIProperty = UIProperty;
		this.parent = parent;
		this.index = index;
	}
	getTextLength(): number {
		return this.getValue().length;
	}

	getValue() {
		const isPrivate = this.UIProperty.name.startsWith("_");
		const privateSign = isPrivate ? "-" : "+";
		const value = `${privateSign} ${this.UIProperty.name}: ${this.UIProperty.type}`;

		return value.replace(/\"/g, "").replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
	}
	generateXML(): string {
		return `
				<mxCell id="${this.id}" value="${this.getValue()}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${this.parent.id}">
					<mxGeometry y="${26 + this.parent.yAxis + 26 * this.index}" width="${this.parent.width}" height="26" as="geometry" />
				</mxCell>`;
	}

}