import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { UIField } from "../../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";
import { SyntaxAnalyzer } from "../../../../CustomLibMetadata/SyntaxAnalyzer";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class Field implements IUMLGenerator, ITextLengthGettable {
	id: number;
	UIField: UIField;
	parent: ClassHead;
	constructor(UIField: UIField, parent: ClassHead) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIField = UIField;
		this.parent = parent;

		if (!this.UIField.type) {
			this.UIField.type = SyntaxAnalyzer.getClassNameOfTheVariable(`this.${this.UIField.name}`);
		}
	}
	getTextLength(): number {
		return `${this.UIField.name}: ${this.UIField.type}`.length;
	}
	generateXML(): string {
		const isPrivate = this.UIField.name.startsWith("_");
		const privateSign = isPrivate ? "-" : "+";

		return `
		<mxCell id="${this.id}" value="${privateSign} ${this.UIField.name}: ${this.UIField.type}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${this.parent.id}">
			<mxGeometry y="26" width="160" height="26" as="geometry" />
		</mxCell>`;
	}
}