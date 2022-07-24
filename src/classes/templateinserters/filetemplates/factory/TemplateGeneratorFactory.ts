import { TemplateGenerator } from "../abstraction/TemplateGenerator";
import { JSTemplateGenerator } from "../JSTemplateGenerator";
import { XMLTemplateGenerator } from "../XMLTemplateGenerator";

export class TemplateGeneratorFactory {
	static createInstance(filePath: string): TemplateGenerator | undefined {
		let templateGenerator;

		if (filePath.endsWith(".js")) {
			templateGenerator = new JSTemplateGenerator();
		} else if (filePath.endsWith(".xml")) {
			templateGenerator = new XMLTemplateGenerator();
		}

		return templateGenerator;
	}
}