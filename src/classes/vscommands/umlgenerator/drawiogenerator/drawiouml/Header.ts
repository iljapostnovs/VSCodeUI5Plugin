import {IUMLGenerator} from "./interfaces/IUMLGenerator";
import {DrawIOUMLDiagram} from "../DrawIOUMLDiagram";

export class Header implements IUMLGenerator {
	id: number;
	constructor() {
		this.id = 1;
	}
	generateXML(): string {
		return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="2020-03-19T00:36:09.045Z" agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.132 Safari/537.36" etag="B3X4o7U7oCs3FZZdjB3L" version="12.8.6" type="google">
	<diagram name="Page-1" id="${DrawIOUMLDiagram.getUniqueId()}">
		<mxGraphModel dx="2000" dy="1113" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" background="#ffffff" math="0" shadow="0">
			<root>
				<mxCell id="0" />
				<mxCell id="${this.id}" parent="0" />`;
	}
}