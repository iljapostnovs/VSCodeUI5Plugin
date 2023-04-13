import { ParserPool, UI5JSParser, UI5TSParser } from "ui5plugin-parser";
import { TemplateGenerator } from "../abstraction/TemplateGenerator";
import { JSTemplateGenerator } from "../JSTemplateGenerator";
import { TSTemplateGenerator } from "../TSTemplateGenerator";
import { XMLTemplateGenerator } from "../XMLTemplateGenerator";

export class TemplateGeneratorFactory {
	static createInstance(filePath: string): TemplateGenerator | undefined {
		let templateGenerator;

		const parser = ParserPool.getParserForFile(filePath);
		if (!parser) {
			return;
		}
		if (filePath.endsWith(".js") && parser instanceof UI5JSParser) {
			templateGenerator = new JSTemplateGenerator(parser);
		} else if (filePath.endsWith(".xml")) {
			templateGenerator = new XMLTemplateGenerator();
		} else if (filePath.endsWith(".ts") && parser instanceof UI5TSParser) {
			templateGenerator = new TSTemplateGenerator(parser);
		}

		return templateGenerator;
	}
}
