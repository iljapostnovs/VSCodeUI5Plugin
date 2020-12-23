import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { UIMethod } from "../../../../UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";
import { AcornSyntaxAnalyzer } from "../../../../UI5Classes/JSParser/AcornSyntaxAnalyzer";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class Method implements IUMLGenerator, ITextLengthGettable {
	id: number;
	UIMethod: UIMethod;
	parent: ClassHead;
	index: number;
	constructor(UIMethod: UIMethod, parent: ClassHead, index: number) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIMethod = UIMethod;
		this.parent = parent;
		this.index = index;
	}
	getTextLength(): number {
		return this.getValue().length;
	}

	getValue() {
		const isPrivate = this.UIMethod.name.startsWith("_");
		const privateSign = isPrivate ? "-" : "+";
		const value = `${privateSign} ${this.UIMethod.name}(${this.UIMethod.params.map(param => param.name).join(", ")}): ${this.UIMethod.returnType}`;
		return value.replace(/\"/g, "").replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');
	}
	generateXML(): string {
		return `
				<mxCell id="${this.id}" value="${this.getValue()}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${this.parent.id}">
					<mxGeometry y="${26 + 8 + this.parent.yAxis + this.index * 26}" width="${this.parent.width}" height="26" as="geometry" />
				</mxCell>`;
	}

}