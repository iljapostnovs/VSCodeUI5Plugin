import { IUMLGenerator } from "../interfaces/IUMLGenerator";
import { DrawIOUMLDiagram } from "../../DrawIOUMLDiagram";
import { Header } from "../Header";
import { ClassHead } from "../ClassHead";

interface SourceTarget {
	source: ClassHead;
	target: ClassHead;
}
export class DependencyLine implements IUMLGenerator {
	id: number;
	parent: Header;
	sourceTarget: SourceTarget;
	constructor(parent: Header, sourceTarget: SourceTarget) {
		this.id = DrawIOUMLDiagram.getUniqueId();
		this.parent = parent;
		this.sourceTarget = sourceTarget;
	}
	generateXML(): string {
		return `
				<mxCell id="${this.id}" style="jumpStyle=arc;jumpSize=25;edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;dashed=1;endArrow=classic;endFill=1;endSize=14;" edge="1" parent="${this.parent.id}" source="${this.sourceTarget.source.id}" target="${this.sourceTarget.target.id}">
					<mxGeometry relative="1" as="geometry" />
				</mxCell>`;
	}
}