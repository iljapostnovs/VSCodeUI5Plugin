import { FileReader } from "../utils/FileReader";
import * as vscode from "vscode";

export interface IInternalizationText {
	text: string;
	description: string;
	id: string;
	positionBegin: number;
	positionEnd: number;
}
interface IResourceModel {
	[key: string]: IInternalizationText[];
}

export class ResourceModelData {
	public static resourceModels: IResourceModel = {};

	static async readTexts() {
		const resourceModelFiles = FileReader.getResourceModelFiles();
		resourceModelFiles.forEach(resourceModelFile => {
			this._updateResourceModelData(resourceModelFile);
		});
	}

	private static _updateResourceModelData(resourceModelFile: { content: string, componentName: string }) {
		this.resourceModels[resourceModelFile.componentName] = [];

		const texts = resourceModelFile.content.match(/.*=.*/g);
		texts?.forEach(text => {
			const textParts = text.split("=");
			const textId = textParts.shift()?.trim();
			const textDescription = textParts.join("=").trim();
			this.resourceModels[resourceModelFile.componentName].push({
				text: `{i18n>${textId}}`,
				description: textDescription,
				id: textId || "",
				positionBegin: resourceModelFile.content.indexOf(text),
				positionEnd: resourceModelFile.content.indexOf(text) + text.length
			});
		});
	}

	static updateCache(document: vscode.TextDocument) {
		const className = FileReader.getClassNameFromPath(document.fileName);
		if (className) {
			const manifest = FileReader.getManifestForClass(className);
			if (manifest) {
				this._updateResourceModelData({
					componentName: manifest.componentName,
					content: document.getText()
				});
			}
		}
	}
}