import * as path from "path";
import { toNative } from "ui5plugin-parser";
import * as vscode from "vscode";
import { DiagnosticsRegistrator } from "../../registrators/DiagnosticsRegistrator";
import { FileRenameHandler, IFileChanges } from "./abstraction/FileRenameHandler";

export class JSTSFileRenameHandler extends FileRenameHandler {
	public handleFileRename(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		this.replaceCurrentClassNameWithNewOne(oldUri, newUri, allFiles);
		this._replaceNamespace(oldUri, newUri, allFiles);
		this._replaceTSClassName(oldUri, newUri, allFiles);

		const isTS = oldUri.fsPath.endsWith(".ts");
		DiagnosticsRegistrator.removeDiagnosticForUri(oldUri, isTS ? "ts" : "js");

		this._parser.classFactory.setNewNameForClass(oldUri.fsPath, newUri.fsPath);

		return allFiles;
	}
	private _replaceTSClassName(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]) {
		const isTS = oldUri.fsPath.endsWith(".ts") && newUri.fsPath.endsWith(".ts");
		if (!isTS) {
			return;
		}

		const normalizedOldPath = toNative(oldUri.fsPath);
		const normalizedNewPath = toNative(newUri.fsPath);

		const oldOrNewFile = allFiles.find(
			file => file.fileData.fsPath === normalizedOldPath || file.fileData.fsPath === normalizedNewPath
		);
		const oldClassName = normalizedOldPath.replace(".ts", "").split(path.sep).pop();
		const newClassName = normalizedNewPath.replace(".ts", "").split(path.sep).pop();
		const oldClassNameControllerAdjusted = oldClassName?.endsWith(".controller")
			? oldClassName.replace(/\.controller$/, "")
			: oldClassName;
		const newClassNameControllerAdjusted = newClassName?.endsWith(".controller")
			? newClassName.replace(/\.controller$/, "")
			: newClassName;

		if (!oldOrNewFile || !oldClassNameControllerAdjusted || !newClassNameControllerAdjusted) {
			return allFiles;
		}

		if (
			oldOrNewFile.fileData.content.includes(`export default class ${oldClassNameControllerAdjusted} `) ||
			oldOrNewFile.fileData.content.includes(`export default abstract class ${oldClassNameControllerAdjusted} `)
		) {
			oldOrNewFile.changed = true;
			oldOrNewFile.fileData.content = oldOrNewFile.fileData.content
				.replace(
					`export default class ${oldClassNameControllerAdjusted} `,
					`export default class ${newClassNameControllerAdjusted} `
				)
				.replace(
					`export default abstract class ${oldClassNameControllerAdjusted} `,
					`export default abstract class ${newClassNameControllerAdjusted} `
				);
		}
	}

	protected _replaceNamespace(oldUri: vscode.Uri, newUri: vscode.Uri, allFiles: IFileChanges[]): IFileChanges[] {
		const oldOrNewFile = allFiles.find(
			file => file.fileData.fsPath === oldUri.fsPath || file.fileData.fsPath === newUri.fsPath
		);
		const oldClassNameDotNotation = this._parser.fileReader.getClassNameFromPath(oldUri.fsPath);
		const newClassNameDotNotation = this._parser.fileReader.getClassNameFromPath(newUri.fsPath);

		if (!oldOrNewFile || !oldClassNameDotNotation || !newClassNameDotNotation) {
			return allFiles;
		}
		const oldNamespaceParts = oldClassNameDotNotation.split(".");
		oldNamespaceParts.pop();
		const oldNamespace = oldNamespaceParts.join(".");
		const newNamespaceParts = newClassNameDotNotation.split(".");
		newNamespaceParts.pop();
		const newNamespace = newNamespaceParts.join(".");

		if (oldOrNewFile.fileData.content.includes(`@namespace ${oldNamespace}`)) {
			oldOrNewFile.changed = true;
			oldOrNewFile.fileData.content = oldOrNewFile.fileData.content.replace(
				`@namespace ${oldNamespace}`,
				`@namespace ${newNamespace}`
			);
		}

		return allFiles;
	}
}
