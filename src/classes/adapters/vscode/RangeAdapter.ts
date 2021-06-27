import LineColumn = require("line-column");
import * as vscode from "vscode";
import { IAcornPosition, PositionAdapter } from "./PositionAdapter";

interface IAcornLocation {
	start: IAcornPosition,
	end: IAcornPosition
}

export class RangeAdapter {
	static offsetsToVSCodeRange(content: string, positionBegin: number, positionEnd: number) {
		const lineColumnBegin = LineColumn(content).fromIndex(positionBegin);
		const lineColumnEnd = LineColumn(content).fromIndex(positionEnd);
		if (lineColumnBegin && lineColumnEnd) {
			const positionBegin = new vscode.Position(lineColumnBegin.line - 1, lineColumnBegin.col - 1);
			const positionEnd = new vscode.Position(lineColumnEnd.line - 1, lineColumnEnd.col - 1);
			return new vscode.Range(positionBegin, positionEnd);
		}
	}

	static acornPositionsToVSCodeRange(positionBegin: IAcornPosition, positionEnd: IAcornPosition) {
		const vscodePositionBegin = PositionAdapter.acornPositionToVSCodePosition(positionBegin);
		const vscodePositionEnd = PositionAdapter.acornPositionToVSCodePosition(positionEnd);
		return new vscode.Range(vscodePositionBegin, vscodePositionEnd);
	}

	static acornLocationToVSCodeRange(location: IAcornLocation) {
		const vscodePositionBegin = PositionAdapter.acornPositionToVSCodePosition(location.start);
		const vscodePositionEnd = PositionAdapter.acornPositionToVSCodePosition(location.end);
		return new vscode.Range(vscodePositionBegin, vscodePositionEnd);
	}
}