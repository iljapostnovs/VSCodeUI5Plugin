import LineColumn = require("line-column");
import * as vscode from "vscode";

export class Util {
	static positionsToVSCodeRange(content: string, positionBegin: number, positionEnd: number) {
		const lineColumnBegin = LineColumn(content).fromIndex(positionBegin);
		const lineColumnEnd = LineColumn(content).fromIndex(positionEnd);
		if (lineColumnBegin && lineColumnEnd) {
			const positionBegin = new vscode.Position(lineColumnBegin.line - 1, lineColumnBegin.col - 1);
			const positionEnd = new vscode.Position(lineColumnEnd.line - 1, lineColumnEnd.col - 1);
			return new vscode.Range(positionBegin, positionEnd);
		}
	}
}