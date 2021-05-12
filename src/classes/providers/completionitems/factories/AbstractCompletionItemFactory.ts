import { ICompletionItemFactory } from "./abstraction/ICompletionItemFactory";
import { ClassCompletionItemFactory } from "./js/ClassCompletionItemFactory";
import { JSDynamicCompletionItemsFactory } from "./js/JSDynamicCompletionItemsFactory";
import { SAPUIDefineFactory } from "./js/sapuidefine/SAPUIDefineFactory";
import { ViewIdCompletionItemFactory } from "./js/ViewIdCompletionItemFactory";
import { StandardXMLCompletionItemFactory } from "./xml/StandardXMLCompletionItemFactory";
import { XMLDynamicCompletionItemFactory } from "./xml/XMLDynamicCompletionItemFactory";

export class AbstractCompletionItemFactory {
	static getFactory(type: AbstractCompletionItemFactory.javascript | AbstractCompletionItemFactory.xml): ICompletionItemFactory {
		let factory: ICompletionItemFactory;
		switch (type) {
			case AbstractCompletionItemFactory.javascript.sapUiDefine:
				factory = new SAPUIDefineFactory();
				break;
			case AbstractCompletionItemFactory.javascript.member:
				factory = new JSDynamicCompletionItemsFactory();
				break;
			case AbstractCompletionItemFactory.javascript.class:
				factory = new ClassCompletionItemFactory();
				break;
			case AbstractCompletionItemFactory.javascript.viewId:
				factory = new ViewIdCompletionItemFactory();
				break;
			case AbstractCompletionItemFactory.xml.standard:
				factory = new StandardXMLCompletionItemFactory();
				break;
			case AbstractCompletionItemFactory.xml.dynamic:
				factory = new XMLDynamicCompletionItemFactory();
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