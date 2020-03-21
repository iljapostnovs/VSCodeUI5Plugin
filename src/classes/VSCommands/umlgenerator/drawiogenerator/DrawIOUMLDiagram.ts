import { AbstractUIClass } from "../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { Property } from "./drawiouml/Property";
import { Method } from "./drawiouml/Method";
import { Field } from "./drawiouml/Field";
import { ClassHead } from "./drawiouml/ClassHead";
import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { Separator } from "./drawiouml/Separator";
import { ITextLengthGettable } from "./drawiouml/interfaces/ITextLengthGettable";

export class DrawIOUMLDiagram {
	private readonly UIClass: AbstractUIClass;
	private static id = 2;
	constructor(UIClass: AbstractUIClass) {
		this.UIClass = UIClass;
	}
	static getUniqueId() {
		return ++this.id;
	}
	generateUMLClassDiagram() {
		const header = new Header();
		const footer = new Footer();

		const body = this.generateBody(header);

		const UMLDiagram = header.generateXML() + body + footer.generateXML();

		return UMLDiagram;
	}

	generateBody(header: Header) {
		const classHead = new ClassHead(this.UIClass, header);
		const separator = new Separator(classHead);
		const properties = this.UIClass.properties.map(property => new Property(property, classHead));
		const fields = this.UIClass.fields.map(field => new Field(field, classHead));
		const methods = this.UIClass.methods.map(method => new Method(method, classHead));

		let items: ITextLengthGettable[] = properties;
		items = items.concat(methods);
		items = items.concat(fields);

		const longestTextLength = this.getLongestTextLength(items);
		classHead.width = 6 * longestTextLength;

		return 	classHead.generateXML() +
				properties.map(property => property.generateXML()).join("") +
				fields.map(field => field.generateXML()).join("") +
				separator.generateXML() +
				methods.map(method => method.generateXML()).join("");
	}

	getLongestTextLength(items: ITextLengthGettable[]) {
		let maxLength = 0;
		items.forEach(item => {
			const itemLength = item.getTextLength();
			if (itemLength > maxLength) {
				maxLength = itemLength;
			}
		});

		return maxLength;
	}
}