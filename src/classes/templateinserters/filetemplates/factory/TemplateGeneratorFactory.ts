import { TemplateGenerator } from "../abstraction/TemplateGenerator";
import { JSTemplateGenerator } from "../JSTemplateGenerator";
import { TSTemplateGenerator } from "../TSTemplateGenerator";
import { XMLTemplateGenerator } from "../XMLTemplateGenerator";

export class TemplateGeneratorFactory {
	static createInstance(filePath: string): TemplateGenerator | undefined {
		let templateGenerator;

		if (filePath.endsWith(".js")) {
			templateGenerator = new JSTemplateGenerator();
		} else if (filePath.endsWith(".xml")) {
			templateGenerator = new XMLTemplateGenerator();
		} else if (filePath.endsWith(".ts")) {
			templateGenerator = new TSTemplateGenerator();
		}

		return templateGenerator;
	}
}