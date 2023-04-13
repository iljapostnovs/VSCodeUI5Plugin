import { WorkspaceFolder } from "ui5plugin-parser";
import ParserBearer from "../../../ui5parser/ParserBearer";
export abstract class DiagramGenerator extends ParserBearer {
	abstract generate(wsFolder: WorkspaceFolder): Promise<string>;
	abstract getFileExtension(): string;
}
