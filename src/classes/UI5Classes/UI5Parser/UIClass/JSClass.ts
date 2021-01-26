import {AbstractUIClass, UIField, UIMethod} from "./AbstractUIClass";
import * as jsClassData from "./jsclassdata/JSClassData.json";

const jsClassDataCopy: any = jsClassData;
Object.keys(jsClassData).forEach(key => {
	jsClassDataCopy[key.toLowerCase()] = jsClassDataCopy[key];
});
const classData: {[key: string]: {methods: UIMethod[], fields: UIField[]}} = jsClassData;
export class JSClass extends AbstractUIClass {
	constructor(className: string) {
		super(className);

		this.methods = classData[className].methods;
		this.fields = classData[className].fields;
	}
}