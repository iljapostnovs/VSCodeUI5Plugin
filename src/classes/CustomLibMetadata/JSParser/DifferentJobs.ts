import { AbstractType } from "./types/AbstractType";
import { JSVariable } from "./types/Variable";
import { JSFunction } from "./types/Function";
import { JSObject } from "./types/Object";

export class DifferentJobs {
	public static getAllVariables(anything: AbstractType) {
		let jsVariables: JSVariable[] = [];
		if (anything instanceof JSVariable) {
			jsVariables.push(anything);
		}

		anything.parts.forEach(part => {
			jsVariables = jsVariables.concat(this.getAllVariables(part));
		});

		if (anything instanceof JSFunction) {
			const variablesFromFunctionParams = <JSVariable[]>(anything.params.filter(param => param instanceof JSVariable));
			jsVariables = jsVariables.concat(variablesFromFunctionParams);
		}

		return jsVariables;
	}

	public static finalizeParsing(anything: AbstractType) {
		//add types to object variables
		if (anything instanceof JSObject) {
			anything.parts.forEach(part => {
				if (part instanceof JSVariable && !part.jsType && anything.parent) {
					const definition = anything.parent.findDefinition(part);
					if (definition) {
						part.jsType = (<JSVariable>definition).jsType;
					}
				}
			});
		}

		anything.parts.forEach(part => {
			this.finalizeParsing(part);
		});
	}
}