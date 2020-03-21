import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { UIMethod } from "../../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";
import { SyntaxAnalyzer } from "../../../../CustomLibMetadata/SyntaxAnalyzer";
import { ITextLengthGettable } from "./interfaces/ITextLengthGettable";

export class Method implements IUMLGenerator, ITextLengthGettable {
	id: number;
	UIMethod: UIMethod;
	parent: ClassHead;
	constructor(UIMethod: UIMethod, parent: ClassHead) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.UIMethod = UIMethod;
		this.parent = parent;

		if (this.UIMethod.returnType === "void") {
			this.UIMethod.returnType = SyntaxAnalyzer.getClassNameOfTheVariable(`this.${this.UIMethod.name}()`) || "void";
		}
	}
	getTextLength(): number {
		return `${this.UIMethod.name}(${this.UIMethod.params.map(param => param).join(", ")}): ${this.UIMethod.returnType}`.length;
	}
	generateXML(): string {
		const isPrivate = this.UIMethod.name.startsWith("_");
		const privateSign = isPrivate ? "-" : "+";

		return `
		<mxCell id="${this.id}" value="${privateSign} ${this.UIMethod.name}(${this.UIMethod.params.map(param => param).join(", ")}): ${this.UIMethod.returnType}" style="text;strokeColor=none;fillColor=none;align=left;verticalAlign=top;spacingLeft=4;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;" vertex="1" parent="${this.parent.id}">
		  <mxGeometry y="60" width="160" height="26" as="geometry" />
		</mxCell>`;
	}

}