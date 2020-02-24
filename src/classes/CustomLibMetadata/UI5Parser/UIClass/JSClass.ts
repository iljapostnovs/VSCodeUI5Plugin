import { AbstractUIClass, UIMethod } from "./AbstractUIClass";
import { MainLooper } from "../../JSParser/MainLooper";
const classData: {[key: string]: {methods: UIMethod[]}} = {
	Promise: {
		methods: [{
			name: "then",
			params: ["fnThen"],
			description: "Promise .then",
			returnType: "Promise"
		},
		{
			name: "catch",
			params: ["fnCatch"],
			description: "Promise .catch",
			returnType: "Promise"
		},
		{
			name: "finally",
			params: ["fnFinally"],
			description: "Promise .finally",
			returnType: "Promise"
		}]
	},
	array: {
		methods: [{
			name: "map",
			params: ["function"],
			description: "map",
			returnType: "array"
		},{
			name: "find",
			params: ["function"],
			description: "find",
			returnType: "any"
		},{
			name: "filter",
			params: ["function"],
			description: "filter",
			returnType: "array"
		},{
			name: "forEach",
			params: ["function"],
			description: "forEach",
			returnType: "void"
		},{
			name: "some",
			params: ["function"],
			description: "some",
			returnType: "boolean"
		},{
			name: "reduce",
			params: ["function"],
			description: "reduce",
			returnType: "array"
		},{
			name: "concat",
			params: ["array"],
			description: "concat",
			returnType: "array"
		},{
			name: "pop",
			params: [],
			description: "pop",
			returnType: "any"
		},{
			name: "push",
			params: [],
			description: "push",
			returnType: "void"
		},{
			name: "slice",
			params: ["begin", "end"],
			description: "slice",
			returnType: "array"
		},{
			name: "splice",
			params: ["start", "deleteCount"],
			description: "splice",
			returnType: "array"
		}]
	}
};
export class JSClass extends AbstractUIClass {
	constructor(className: string) {
		super(className);

		this.methods = classData[className].methods;
	}

	public getClassOfTheVariable(variableName: string, position: number): string | undefined {
		let className: string | undefined;
		if (variableName === "this") {
			className = this.className;
		} else {
			const methodParams = MainLooper.getEndOfChar("(", ")", variableName);
			const methodName = variableName.replace(methodParams, "").replace("this.", "");
			const method = this.methods.find(method => method.name === methodName);
			if (method) {
				className = method.returnType;
			}
		}

		return className;
	}
}