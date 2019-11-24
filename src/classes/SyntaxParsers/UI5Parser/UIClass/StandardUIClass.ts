import { AbstractUIClass, UIMethod } from "./AbstractUIClass"
import { SAPNodeDAO } from "../../../DAO/SAPNodeDAO";

export class StandardUIClass extends AbstractUIClass {
	private nodeDAO = new SAPNodeDAO();

	constructor(className: string) {
		super(className);

		this.fillMethods();
	}

	private fillMethods() {
		this.methods = this.getStandardClassMethods(this.className);
	}

	private getStandardClassMethods(className: string) {
		let classMethods:UIMethod[] = [];
		let SAPNode = this.findSAPNode(className);
		if (SAPNode) {
			let metadata = SAPNode.getMetadataSync();
			if (metadata) {
				classMethods = metadata.rawMetadata.methods.reduce((accumulator: UIMethod[], method:any) => {
					if (method.visibility === "public") {
						accumulator.push({
							name: method.name,
							description: this.removeTags(method.code),
							params: method.parameters ? method.parameters.map((parameter: any) => parameter.name) : [],
							returnType: method.returnValue ? method.returnValue.type : "void"
						});
					}
					return accumulator;
				}, []);

				if (metadata.rawMetadata.extends) {
					classMethods = classMethods.concat(this.getStandardClassMethods(metadata.rawMetadata.extends));
				}
			}
		}
		return classMethods;
	}

	private findSAPNode(className: string) {
		let SAPNodes = this.nodeDAO.getAllNodesSync();
		return SAPNodes.find(SAPNode => SAPNode.getName() === className);
	}

	private removeTags(text: string) {
		const noTagsTestResult = /(?<=\<.*\>).*(?=\<.*\>)/.exec(text);
		return noTagsTestResult ? noTagsTestResult[0] : text;
	}
}