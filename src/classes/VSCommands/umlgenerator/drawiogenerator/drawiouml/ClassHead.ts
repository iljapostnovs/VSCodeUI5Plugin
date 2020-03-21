import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { AbstractUIClass } from "../../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { Header } from "./Header";

export class ClassHead implements IUMLGenerator {
	id: number;
	parent: Header;
	width: number = 160;
	UIClass: AbstractUIClass;
	constructor(UIClass: AbstractUIClass, parent: Header) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIClass = UIClass;
		this.parent = parent;
	}
	generateXML(): string {
		return `
		<mxCell id="${this.id}" value="${this.UIClass.className}" style="swimlane;fontStyle=1;align=center;verticalAlign=top;childLayout=stackLayout;horizontal=1;startSize=26;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=1;marginBottom=0;fillColor=#dae8fc;strokeColor=#6c8ebf;swimlaneFillColor=#DAE8FC;" vertex="1" parent="${this.parent.id}">
          <mxGeometry x="70" y="80" width="${this.width}" height="86" as="geometry" />
        </mxCell>`;
	}

}