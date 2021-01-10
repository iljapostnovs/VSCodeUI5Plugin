import { AbstractUIClass, UIField, UIMethod } from "./AbstractUIClass";
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
const classData: {[key: string]: {methods: UIMethod[], fields: UIField[]}} = {
	Promise: {
		methods: [{
			name: "then",
			params: [{
				name: "fnThen",
				description: "",
				type: "function",
				isOptional: false
			}],
			description: "Promise .then",
			returnType: "Promise",
			visibility: "public"
		},
		{
			name: "catch",
			params: [{
				name: "fnCatch",
				description: "",
				type: "function",
				isOptional: false
			}],
			description: "Promise .catch",
			returnType: "Promise",
			visibility: "public"
		},
		{
			name: "finally",
			params: [{
				name: "fnFinally",
				description: "",
				type: "function",
				isOptional: false
			}],
			description: "Promise .finally",
			returnType: "Promise",
			visibility: "public"
		}],
		fields: []
	},
	array: {
		methods: getAllFuncs([]).reduce((accumulator: UIMethod[], key: any) => {
			if (Array.prototype[key] instanceof Function) {
				const params = [];
				for (let i = 0; i < Array.prototype[key].length; i++) {
					params.push({
						name: `param${i}`,
						description: "generic param for array method",
						type: "any",
						isOptional: false
					});
				}
				accumulator.push({
					name: key,
					params: params,
					description: key,
					returnType: "array",
					visibility: "public"
				});
			}

			return accumulator;
		}, []),
		fields: [{
			name: "length",
			description: "Length of an array",
			type: "number",
			visibility: "public"
		}]
	},
	Array: {
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
		}, []),
		fields: [{
			name: "length",
			description: "Length of an array",
			type: "number",
			visibility: "public"
		}]
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
		}, []),
		fields: []
	},
	String: {
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
		}, []),
		fields: []
	}
};
export class JSClass extends AbstractUIClass {
	constructor(className: string) {
		super(className);

		this.methods = classData[className].methods;
		this.fields = classData[className].fields;
	}
}