import { Property } from "./drawiouml/Property";
import { Method } from "./drawiouml/Method";
import { Field } from "./drawiouml/Field";
import { ClassHead } from "./drawiouml/ClassHead";
import { Header } from "./drawiouml/Header";
import { Footer } from "./drawiouml/Footer";
import { Separator } from "./drawiouml/Separator";
import { ITextLengthGettable } from "./drawiouml/interfaces/ITextLengthGettable";
import {
	AbstractUIClass,
	IUIField,
	IUIMethod
} from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/AbstractUIClass";
import { CustomUIClass } from "ui5plugin-parser/dist/classes/UI5Classes/UI5Parser/UIClass/CustomUIClass";
import { UI5Parser } from "ui5plugin-parser";
import { AbstractUI5Parser } from "ui5plugin-parser/dist/IUI5Parser";

export class DrawIOUMLDiagram {
	readonly UIClass: AbstractUIClass;
	static id = 2;
	private _xAxis = 70;
	private _yAxis = 80;
	public width = 0;
	private static readonly _pixelsPerChar = 6;
	readonly classHead: ClassHead;
	readonly header: Header;
	constructor(UIClass: AbstractUIClass, header: Header = new Header()) {
		this.UIClass = UIClass;

		try {
			this.UIClass.fields.forEach(field => {
				if (!field.type) {
					AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findFieldType(
						field,
						this.UIClass.className,
						true,
						true
					);
				}
			});

			this.UIClass.methods.forEach(method => {
				if (method.returnType === "void") {
					AbstractUI5Parser.getInstance(UI5Parser).syntaxAnalyser.findMethodReturnType(
						method,
						this.UIClass.className,
						true,
						true
					);
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

		this._calculateHeightAndWidth();
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

	private _calculateHeightAndWidth() {
		let index = 0;
		const properties = this.UIClass.properties.map(
			(property, i) => new Property(property, this.classHead, index + i)
		);
		index += properties.length;
		const fields = this.UIClass.fields
			.sort((a: IUIField, b: IUIField) => {
				const isFirstFieldPrivate = a.name.startsWith("_");
				const isSecondFieldPrivate = b.name.startsWith("_");

				return isFirstFieldPrivate === isSecondFieldPrivate ? 0 : isFirstFieldPrivate ? 1 : -1;
			})
			.filter(field => field.name !== "prototype")
			.map((field, i) => new Field(field, this.classHead, index + i));
		index += fields.length;
		const methods = this.UIClass.methods
			.sort((a: IUIMethod, b: IUIMethod) => {
				const isFirstMethodPrivate = a.name.startsWith("_");
				const isSecondMethodPrivate = b.name.startsWith("_");

				return isFirstMethodPrivate === isSecondMethodPrivate ? 0 : isFirstMethodPrivate ? 1 : -1;
			})
			.map((method, i) => new Method(method, this.classHead, index + i));

		let items: ITextLengthGettable[] = properties;
		items = items.concat(methods);
		items = items.concat(fields);
		items = items.concat(this.classHead);

		const longestTextLength = this.getLongestTextLength(items);
		const pixelsPerChar =
			longestTextLength === this.classHead.getTextLength()
				? DrawIOUMLDiagram._pixelsPerChar + 1
				: DrawIOUMLDiagram._pixelsPerChar;
		this.width = pixelsPerChar * longestTextLength;

		this.classHead.width = this.width;
		this.classHead.height = items.length * this.classHead.height + 8;
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
		let index = 0;
		const properties = this.UIClass.properties.map(
			(property, i) => new Property(property, this.classHead, index + i)
		);
		index += properties.length;
		const fields = this.UIClass.fields
			.sort((a: IUIField, b: IUIField) => {
				const isFirstFieldPrivate = a.name.startsWith("_");
				const isSecondFieldPrivate = b.name.startsWith("_");

				return isFirstFieldPrivate === isSecondFieldPrivate ? 0 : isFirstFieldPrivate ? 1 : -1;
			})
			.filter(field => field.name !== "prototype")
			.map((field, i) => new Field(field, this.classHead, index + i));
		index += fields.length;
		const methods = this.UIClass.methods
			.sort((a: IUIMethod, b: IUIMethod) => {
				const isFirstMethodPrivate = a.name.startsWith("_");
				const isSecondMethodPrivate = b.name.startsWith("_");

				return isFirstMethodPrivate === isSecondMethodPrivate ? 0 : isFirstMethodPrivate ? 1 : -1;
			})
			.map((method, i) => new Method(method, this.classHead, index + i));

		const separator = new Separator(this.classHead, fields.length + properties.length);

		return (
			this.classHead.generateXML() +
			properties.map(property => property.generateXML()).join("") +
			fields.map(field => field.generateXML()).join("") +
			separator.generateXML() +
			methods.map(method => method.generateXML()).join("")
		);
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
