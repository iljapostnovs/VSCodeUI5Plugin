import { AbstractUIClass, UIMethod } from "./AbstractUIClass";
import { SAPNodeDAO } from "../../../StandardLibMetadata/SAPNodeDAO";
import { MainLooper } from "../../JSParser/MainLooper";

export class StandardUIClass extends AbstractUIClass {
	private nodeDAO = new SAPNodeDAO();
	public methods: StandardClassUIMethod[] = [];

	constructor(className: string) {
		super(className);

		this.fillMethods();
		this.fillParentClassName();
	}

	private fillMethods() {
		this.methods = this.getStandardClassMethods(this.className, true);
	}

	private getStandardClassMethods(className: string, isParent: boolean) {
		let classMethods:StandardClassUIMethod[] = [];
		const SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				classMethods = metadata.rawMetadata.methods.reduce((accumulator: StandardClassUIMethod[], method:any) => {
					if (method.visibility === "public") {
						accumulator.push({
							name: method.name,
							description: this.removeTags(method.code),
							params: method.parameters ? method.parameters.map((parameter: any) => parameter.name) : [],
							returnType: method.returnValue ? method.returnValue.type : "void",
							isFromParent: !isParent,
							api: `[ui5.com](https://ui5.sap.com/#/api/${SAPNode.getName()}%23methods/${method.name})`
						});
					}
					return accumulator;
				}, []);

				if (metadata.rawMetadata.extends) {
					classMethods = classMethods.concat(this.getStandardClassMethods(metadata.rawMetadata.extends, false));
				}
			}
		}
		return classMethods;
	}

	private findSAPNode(className: string) {
		const SAPNodes = this.nodeDAO.getAllNodesSync();
		return SAPNodes.find(SAPNode => SAPNode.getName() === className);
	}

	private removeTags(text: string) {
		const noTagsTestResult = /(?<=\<.*\>).*(?=\<.*\>)/.exec(text);
		return noTagsTestResult ? noTagsTestResult[0] : text;
	}

	private fillParentClassName() {
		const SAPNode = this.findSAPNode(this.className);
		if (SAPNode) {
			const metadata = SAPNode.getMetadataSync();
			if (metadata) {
				this.parentClassNameDotNotation = metadata.rawMetadata.extends;
			}
		}
	}

	public getClassOfTheVariable(variableName: string, position: number) {
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

interface StandardClassUIMethod extends UIMethod {
	isFromParent: boolean;
}