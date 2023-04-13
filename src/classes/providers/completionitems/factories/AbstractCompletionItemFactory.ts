import { UI5JSParser } from "ui5plugin-parser";
import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";
import { ICompletionItemFactory } from "./abstraction/ICompletionItemFactory";
import { ClassCompletionItemFactory } from "./js/ClassCompletionItemFactory";
import { JSDynamicCompletionItemsFactory } from "./js/JSDynamicCompletionItemsFactory";
import { SAPUIDefineFactory } from "./js/sapuidefine/SAPUIDefineFactory";
import { ViewIdCompletionItemFactory } from "./js/ViewIdCompletionItemFactory";
import { StandardXMLCompletionItemFactory } from "./xml/StandardXMLCompletionItemFactory";
import { XMLDynamicCompletionItemFactory } from "./xml/XMLDynamicCompletionItemFactory";

export class AbstractCompletionItemFactory {
	static getFactory(
		type: AbstractCompletionItemFactory.javascript | AbstractCompletionItemFactory.xml,
		parser: IUI5Parser
	): ICompletionItemFactory | undefined {
		let factory: ICompletionItemFactory | undefined;
		switch (type) {
			case AbstractCompletionItemFactory.javascript.sapUiDefine:
				if (parser instanceof UI5JSParser) {
					factory = new SAPUIDefineFactory(parser);
				}
				break;
			case AbstractCompletionItemFactory.javascript.member:
				if (parser instanceof UI5JSParser) {
					factory = new JSDynamicCompletionItemsFactory(parser);
				}
				break;
			case AbstractCompletionItemFactory.javascript.class:
				if (parser instanceof UI5JSParser) {
					factory = new ClassCompletionItemFactory(parser);
				}
				break;
			case AbstractCompletionItemFactory.javascript.viewId:
				if (parser instanceof UI5JSParser) {
					factory = new ViewIdCompletionItemFactory(parser);
				}
				break;
			case AbstractCompletionItemFactory.xml.standard:
				factory = new StandardXMLCompletionItemFactory(parser);
				break;
			case AbstractCompletionItemFactory.xml.dynamic:
				factory = new XMLDynamicCompletionItemFactory(parser);
				break;
		}

		return factory;
	}
}

export namespace AbstractCompletionItemFactory {
	export enum javascript {
		sapUiDefine = 1,
		member = 2,
		class = 3,
		viewId = 4
	}
	export enum xml {
		standard = 11,
		dynamic = 12
	}
}
