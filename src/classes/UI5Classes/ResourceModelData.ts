import {FileReader} from "../utils/FileReader";
import {TypeValue} from "./UI5Parser/UIClass/AbstractUIClass";

interface ResourceModel {
	[key: string]: TypeValue[];
}

export class ResourceModelData {
	public static resourceModels: ResourceModel = {};

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