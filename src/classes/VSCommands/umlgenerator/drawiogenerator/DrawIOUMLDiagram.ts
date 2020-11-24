import { AbstractUIClass, UIField, UIMethod } from "../../../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";
import { Property } from "./drawiouml/Property";
import { Method } from "./drawiouml/Method";
import { Field } from "./drawiouml/Field";
import { ClassHead } from "./drawiouml/ClassHead";
import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { Separator } from "./drawiouml/Separator";
import { ITextLengthGettable } from "./drawiouml/interfaces/ITextLengthGettable";
import { AcornSyntaxAnalyzer } from "../../../CustomLibMetadata/JSParser/AcornSyntaxAnalyzer";
import { CustomUIClass } from "../../../CustomLibMetadata/UI5Parser/UIClass/CustomUIClass";

export class DrawIOUMLDiagram {
	readonly UIClass: AbstractUIClass;
	static id = 2;
	private _xAxis = 70;
	private _yAxis = 80;
	public width = 0;
	private static readonly pixelsPerChar = 6;
	readonly classHead: ClassHead;
	readonly header: Header;
	constructor(UIClass: AbstractUIClass, header: Header = new Header()) {
		this.UIClass = UIClass;

		try {
			this.UIClass.fields.forEach(field => {
				if (!field.type) {
					AcornSyntaxAnalyzer.findFieldType(field, this.UIClass.className);
				}
			});

			this.UIClass.methods.forEach(method => {
				if (method.returnType === "void") {
					AcornSyntaxAnalyzer.findMethodReturnType(method, this.UIClass.className);
				}
			});
		} catch (error) {
			console.error(error);
		}

		if (this.UIClass instanceof CustomUIClass) {
			this.UIClass.fillTypesFromHungarionNotation();
		}

		this.header = header;
		this.classHead = new ClassHead(this.UIClass, header);

		this.calculateHeightAndWidth();
	}


	public get xAxis() {
		return this._xAxis;
	}
	public set xAxis(value) {
		this.classHead.xAxis = value;
		this._xAxis = value;
	}
	public get yAxis() {
		return this._yAxis;
	}
	public set yAxis(value) {
		this.classHead.yAxis = value;
		this._yAxis = value;
	}

	private calculateHeightAndWidth() {
		const properties = this.UIClass.properties.map(property => new Property(property, this.classHead));
		const fields = this.UIClass.fields.sort((a: UIField, b: UIField) => {
			const isFirstFieldPrivate = a.name.startsWith("_");
			const isSecondFieldPrivate = b.name.startsWith("_");

			return isFirstFieldPrivate === isSecondFieldPrivate ? 0 : isFirstFieldPrivate ? 1 : -1;
		}).map(field => new Field(field, this.classHead));
		const methods = this.UIClass.methods.sort((a: UIMethod, b: UIMethod) => {
			const isFirstMethodPrivate = a.name.startsWith("_");
			const isSecondMethodPrivate = b.name.startsWith("_");

			return isFirstMethodPrivate === isSecondMethodPrivate ? 0 : isFirstMethodPrivate ? 1 : -1;
		}).map(method => new Method(method, this.classHead));

		let items: ITextLengthGettable[] = properties;
		items = items.concat(methods);
		items = items.concat(fields);
		items = items.concat(this.classHead);

		const longestTextLength = this.getLongestTextLength(items);
		const pixelsPerChar = longestTextLength === this.classHead.getTextLength() ? DrawIOUMLDiagram.pixelsPerChar + 1 : DrawIOUMLDiagram.pixelsPerChar;
		this.width = pixelsPerChar * longestTextLength;

		this.classHead.width = this.width;
		this.classHead.height = items.length * this.classHead.height;
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
		const separator = new Separator(this.classHead);
		const properties = this.UIClass.properties.map(property => new Property(property, this.classHead));
		const fields = this.UIClass.fields.sort((a: UIField, b: UIField) => {
			const isFirstFieldPrivate = a.name.startsWith("_");
			const isSecondFieldPrivate = b.name.startsWith("_");

			return isFirstFieldPrivate === isSecondFieldPrivate ? 0 : isFirstFieldPrivate ? 1 : -1;
		}).map(field => new Field(field, this.classHead));
		const methods = this.UIClass.methods.sort((a: UIMethod, b: UIMethod) => {
			const isFirstMethodPrivate = a.name.startsWith("_");
			const isSecondMethodPrivate = b.name.startsWith("_");

			return isFirstMethodPrivate === isSecondMethodPrivate ? 0 : isFirstMethodPrivate ? 1 : -1;
		}).map(method => new Method(method, this.classHead));

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