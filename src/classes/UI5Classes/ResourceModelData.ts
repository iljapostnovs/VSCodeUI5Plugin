import { FileReader } from "../utils/FileReader";
import { ITypeValue } from "./UI5Parser/UIClass/AbstractUIClass";

interface IResourceModel {
	[key: string]: ITypeValue[];
}

export class ResourceModelData {
	public static resourceModels: IResourceModel = {};

	static async readTexts() {
		const resourceModelFiles = FileReader.getResourceModelFiles();
		resourceModelFiles.forEach(resourceModelFile => {
			this.resourceModels[resourceModelFile.componentName] = [];

			const texts = resourceModelFile.content.match(/.*=.*/g);
			texts?.forEach(text => {
				const textParts = text.split("=");
				this.resourceModels[resourceModelFile.componentName].push({
					text: `{i18n>${textParts[0].trim()}}`,
					description: textParts[1].trim()
				});
			});
		});
	}
}