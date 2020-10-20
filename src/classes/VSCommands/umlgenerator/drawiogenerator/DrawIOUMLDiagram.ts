import { AbstractUIClass } from "../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { Property } from "./drawiouml/Property";
import { Method } from "./drawiouml/Method";
import { Field } from "./drawiouml/Field";
import { ClassHead } from "./drawiouml/ClassHead";
import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { Separator } from "./drawiouml/Separator";
import { ITextLengthGettable } from "./drawiouml/interfaces/ITextLengthGettable";
import { SyntaxAnalyzer } from "../../../CustomLibMetadata/SyntaxAnalyzer";
import { UIClassDefinitionFinder } from "../../../CustomLibMetadata/UI5Parser/UIClass/UIClassDefinitionFinder";
import { CustomUIClass } from "../../../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";

export class DrawIOUMLDiagram {
	readonly UIClass: AbstractUIClass;
	static id = 2;
	public xAxis = 70;
	public width = 0;
	private static readonly pixelsPerChar = 6;
	readonly classHead: ClassHead;
	readonly header: Header;
	constructor(UIClass: AbstractUIClass, header: Header = new Header()) {
		this.UIClass = UIClass;

		// this.UIClass.fields.forEach(field => {
		// 	if (!field.type) {
		// 		const variableParts = SyntaxAnalyzer.splitVariableIntoParts(`this.${field.name}`);
		// 		UIClassDefinitionFinder.getAdditionalJSTypesHierarchically(UIClass);
		// 		field.type = SyntaxAnalyzer.getClassNameFromVariableParts(variableParts, UIClass, 1, 0);
		// 	}
		// });

		// this.UIClass.methods.forEach(method => {
		// 	if (method.returnType === "void") {
		// 		const variableParts = SyntaxAnalyzer.splitVariableIntoParts(`this.${method.name}()`);
		// 		UIClassDefinitionFinder.getAdditionalJSTypesHierarchically(UIClass);
		// 		method.returnType = SyntaxAnalyzer.getClassNameFromVariableParts(variableParts, UIClass, 1, 0) || "void";
		// 	}
		// });

		if (this.UIClass instanceof CustomUIClass) {
			this.UIClass.fillTypesFromHungarionNotation();
		}


		this.header = header;
		this.classHead = new ClassHead(this.UIClass, header);
	}

	static getUniqueId() {
		return ++this.id;
	}

	generateUMLClassDiagram() {
		const body = this.generateBody();

		const UMLDiagram = this.header.generateXML() + body + new Footer().generateXML();

		return UMLDiagram;
	}

	generateBody() {
		this.classHead.xAxis = this.xAxis;
		const separator = new Separator(this.classHead);
		const properties = this.UIClass.properties.map(property => new Property(property, this.classHead));
		const fields = this.UIClass.fields.map(field => new Field(field, this.classHead));
		const methods = this.UIClass.methods.map(method => new Method(method, this.classHead));

		let items: ITextLengthGettable[] = properties;
		items = items.concat(methods);
		items = items.concat(fields);
		items = items.concat(this.classHead);

		const longestTextLength = this.getLongestTextLength(items);
		const pixelsPerChar = longestTextLength === this.classHead.getTextLength() ? DrawIOUMLDiagram.pixelsPerChar + 1 : DrawIOUMLDiagram.pixelsPerChar;
		this.width = pixelsPerChar * longestTextLength;
		this.classHead.width = this.width;
		this.classHead.height = items.length * this.classHead.height;

		return 	this.classHead.generateXML() +
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