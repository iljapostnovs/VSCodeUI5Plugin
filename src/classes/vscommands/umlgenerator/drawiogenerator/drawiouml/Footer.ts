import {IUMLGenerator} from "./interfaces/IUMLGenerator";

export class Footer implements IUMLGenerator {
	id: number;
	constructor() {
		this.id = 0;
	}
	generateXML(): string {
		return `
			</root>
		</mxGraphModel>
	</diagram>
</mxfile>`;
	}

}