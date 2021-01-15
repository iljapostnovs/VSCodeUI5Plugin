import { AbstractUIClass, UIField, UIMethod } from "./AbstractUIClass";

const jsClassData = require("./jsclassdata/JSClassData.json");
Object.keys(jsClassData).forEach(key => {
	jsClassData[key.toLowerCase()] = jsClassData[key];
});
const classData: {[key: string]: {methods: UIMethod[], fields: UIField[]}} = jsClassData;
export class JSClass extends AbstractUIClass {
	constructor(className: string) {
		super(className);

		this.methods = classData[className].methods;
		this.fields = classData[className].fields;
	}
}