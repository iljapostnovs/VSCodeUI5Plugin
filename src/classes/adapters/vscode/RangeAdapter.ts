import LineColumn = require("line-column");
import { SourceFile } from "ts-morph";
import { IRange } from "ui5plugin-parser/dist/classes/parsing/util/range/adapters/RangeAdapter";
import * as vscode from "vscode";
import { IAcornPosition, PositionAdapter } from "./PositionAdapter";

export interface IAcornLocation {
	start: IAcornPosition;
	end: IAcornPosition;
}

export class RangeAdapter {
	static rangeToVSCodeRange(range: IRange) {
		const positionBegin = new vscode.Position(range.start.line - 1, range.start.column);
		const positionEnd = new vscode.Position(range.end.line - 1, range.end.column);
		return new vscode.Range(positionBegin, positionEnd);
	}

	static offsetsToVSCodeRange(content: string, positionBegin: number, positionEnd: number) {
		const lineColumn = LineColumn(content);
		const lineColumnBegin = lineColumn.fromIndex(positionBegin);
		const lineColumnEnd = lineColumn.fromIndex(positionEnd);
		if (lineColumnBegin && lineColumnEnd) {
			const positionBegin = new vscode.Position(lineColumnBegin.line - 1, lineColumnBegin.col - 1);
			const positionEnd = new vscode.Position(lineColumnEnd.line - 1, lineColumnEnd.col);
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

	static tsOffsetsToVSCodeRange(start: number, end: number, sourceFile: SourceFile) {
		const lineColumnBegin = sourceFile.getLineAndColumnAtPos(start);
		const lineColumnEnd = sourceFile.getLineAndColumnAtPos(end);
		const positionBegin = new vscode.Position(lineColumnBegin.line - 1, lineColumnBegin.column - 1);
		const positionEnd = new vscode.Position(lineColumnEnd.line - 1, lineColumnEnd.column - 1);

		return new vscode.Range(positionBegin, positionEnd);
	}
}
