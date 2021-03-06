import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { AbstractUIClass } from "../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { Header } from "./Header";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class ClassHead implements IUMLGenerator, ITextLengthGettable {
	id: number;
	parent: Header;
	width = 160;
	height = 26;
	xAxis = 0;
	yAxis = 0;
	UIClass: AbstractUIClass;
	constructor(UIClass: AbstractUIClass, parent: Header) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIClass = UIClass;
		this.parent = parent;
	}
	getTextLength(): number {
		return this.UIClass.className.length;
	}
	generateXML(): string {
		return `
				<mxCell id="${this.id}" value="${this.UIClass.className}" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#dae8fc;strokeColor=#6c8ebf;swimlaneFillColor=#DAE8FC;" vertex="1" parent="${this.parent.id}">
					<mxGeometry x="${this.xAxis}" y="${this.yAxis}" width="${this.width}" height="${this.height}" as="geometry" />
				</mxCell>`;
	}

}