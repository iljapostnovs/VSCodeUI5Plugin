import { IUMLGenerator } from "./interfaces/IUMLGenerator";
import { DrawIOUMLDiagram } from "../DrawIOUMLDiagram";
import { ClassHead } from "./ClassHead";

export class Separator implements IUMLGenerator {
	id: number;
	parent: ClassHead;
	constructor(parent: ClassHead) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.parent = parent;
	}
	generateXML(): string {
		return `
				<mxCell id="${this.id}" value="" style="line;strokeWidth=1;fillColor=#dae8fc;align=left;verticalAlign=middle;spacingTop=-1;spacingLeft=3;spacingRight=3;rotatable=0;labelPosition=right;points=[];portConstraint=eastwest;strokeColor=#6c8ebf;" vertex="1" parent="${this.parent.id}">
					<mxGeometry y="52" width="160" height="8" as="geometry" />
				</mxCell>`;
	}

}