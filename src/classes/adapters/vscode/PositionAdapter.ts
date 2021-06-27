import LineColumn = require("line-column");
import * as vscode from "vscode";
export interface IAcornPosition {
	line: number,
	column: number
}

export class PositionAdapter {
	static offsetToPosition(content: string, position: number) {
		const lineColumn = LineColumn(content).fromIndex(position);
		return lineColumn && new vscode.Position(lineColumn.line - 1, lineColumn.col - 1);
	}

	static acornPositionToVSCodePosition(position: IAcornPosition) {
		return new vscode.Position(position.line - 1, position.column);
	}
}