import { AbstractUIClass, UIMethod } from "./AbstractUIClass";
import { MainLooper } from "../../JSParser/MainLooper";
function getAllFuncs(toCheck: any) {
	let props: string[] = [];
	let obj = toCheck;
	do {
		props = props.concat(Object.getOwnPropertyNames(obj));
	} while (obj = Object.getPrototypeOf(obj));

	return props.sort().filter(function(e, i, arr) {
		if (e!=arr[i+1] && typeof toCheck[e] == 'function') return true;
	});
}
const classData: {[key: string]: {methods: UIMethod[]}} = {
	Promise: {
		methods: [{
			name: "then",
			params: ["fnThen"],
			description: "Promise .then",
			returnType: "Promise",
			visibility: "public"
		},
		{
			name: "catch",
			params: ["fnCatch"],
			description: "Promise .catch",
			returnType: "Promise",
			visibility: "public"
		},
		{
			name: "finally",
			params: ["fnFinally"],
			description: "Promise .finally",
			returnType: "Promise",
			visibility: "public"
		}]
	},
	array: {
		methods: getAllFuncs([]).reduce((accumulator: UIMethod[], key: any) => {
			if (Array.prototype[key] instanceof Function) {
				accumulator.push({
					name: key,
					params: [],
					description: key,
					returnType: "array",
					visibility: "public"
				});
			}

			return accumulator;
		}, [])
	},
	string: {
		methods: getAllFuncs("").reduce((accumulator: UIMethod[], key: any) => {
			if (Array.prototype[key] instanceof Function) {
				accumulator.push({
					name: key,
					params: [],
					description: key,
					returnType: "string",
					visibility: "public"
				});
			}

			return accumulator;
		}, [])
	}
};
export class JSClass extends AbstractUIClass {
	constructor(className: string) {
		super(className);

		this.methods = classData[className].methods;
	}
}