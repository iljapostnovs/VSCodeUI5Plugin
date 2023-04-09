import { ILocation } from "ui5plugin-parser/dist/classes/parsing/util/referencefinder/ReferenceFinderBase";
import * as vscode from "vscode";
import { RangeAdapter } from "../../adapters/vscode/RangeAdapter";
export class VSCodeLocationAdapter extends vscode.Location {
	constructor(location: ILocation) {
		const uri = vscode.Uri.file(location.filePath);
		const range = RangeAdapter.rangeToVSCodeRange(location.range);
		super(uri, range);
	}
}
