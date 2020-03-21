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

export class DrawIOUMLDiagram {
	private readonly UIClass: AbstractUIClass;
	private static id = 2;
	public xAxis = 70;
	public width = 0;

	private static readonly pixelsPerChar = 7;
	constructor(UIClass: AbstractUIClass) {
		this.UIClass = UIClass;

		this.UIClass.fields.forEach(field => {
			if (!field.type) {
				const variableParts = SyntaxAnalyzer.splitVariableIntoParts(`this.${field.name}`);
				UIClassDefinitionFinder.getAdditionalJSTypesHierarchically(UIClass);
				field.type = SyntaxAnalyzer.getClassNameFromVariableParts(variableParts, UIClass, 1, 0);
			}
		});

		this.UIClass.methods.forEach(method => {
			if (method.returnType === "void") {
				const variableParts = SyntaxAnalyzer.splitVariableIntoParts(`this.${method.name}()`);
				UIClassDefinitionFinder.getAdditionalJSTypesHierarchically(UIClass);
				method.returnType = SyntaxAnalyzer.getClassNameFromVariableParts(variableParts, UIClass, 1, 0) || "void";
			}
		});
	}

	private findTypes() {

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
		classHead.xAxis = this.xAxis;
		const separator = new Separator(classHead);
		const properties = this.UIClass.properties.map(property => new Property(property, classHead));
		const fields = this.UIClass.fields.map(field => new Field(field, classHead));
		const methods = this.UIClass.methods.map(method => new Method(method, classHead));

		let items: ITextLengthGettable[] = properties;
		items = items.concat(methods);
		items = items.concat(fields);
		items = items.concat(classHead);

		const longestTextLength = this.getLongestTextLength(items);
		this.width = DrawIOUMLDiagram.pixelsPerChar * longestTextLength;
		classHead.width = this.width;

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