import { AbstractUIClass } from "./AbstractUIClass"
import { StandardUIClass } from "./StandardUIClass"
import { CustomUIClass } from "./CustomUIClass"

// interface ClassMapping {
// 	[key: string]: { new <T extends AbstractUIClass>(): T }
// }
export class UIClassFactory {
	public static getInstance(className: string, documentText?: string) {
		let returnClass: AbstractUIClass;
		if (className.startsWith("sap.")) {
			returnClass = new StandardUIClass(className);
		} else {
			console.time(`Class parsing for ${className} took: `);
			returnClass = new CustomUIClass(className, documentText);
			console.timeEnd(`Class parsing for ${className} took: `);
		}
		return returnClass;
	}
}