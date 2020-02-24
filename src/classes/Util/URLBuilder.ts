import * as vscode from "vscode";
import { SAPNode } from "../StandardLibMetadata/SAPNode";
import { AbstractUIClass } from "../CustomLibMetadata/UI5Parser/UIClass/AbstractUIClass";

export class URLBuilder {
	private static URLBuilderInstance?: URLBuilder;
	private readonly UI5Version: string;
	private readonly URLHost = "https://ui5.sap.com/";

	private constructor(UI5Version: string) {
		this.UI5Version = UI5Version;
	}

	static getInstance() {
		if (!this.URLBuilderInstance) {
			const UI5Version: any = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
			this.URLBuilderInstance = new URLBuilder(UI5Version);
		}

		return this.URLBuilderInstance;
	}

	getMarkupUrlForClassApi(SAPClass: SAPNode | AbstractUIClass) {
		return this.wrapInMarkup(this.getUrlForClassApi(SAPClass));
	}

	getMarkupUrlForPropertiesApi(SAPClass: AbstractUIClass) {
		return this.wrapInMarkup(this.getUrlForPropertiesApi(SAPClass));
	}

	getMarkupUrlForAggregationApi(SAPClass: AbstractUIClass) {
		return this.wrapInMarkup(this.geUrlForAggregationApi(SAPClass));
	}

	getMarkupUrlForAssociationApi(SAPClass: AbstractUIClass) {
		return this.wrapInMarkup(this.geUrlForAssociationApi(SAPClass));
	}

	getMarkupUrlForEventsApi(SAPClass: AbstractUIClass, eventName: string = "Events") {
		return this.wrapInMarkup(this.geUrlForEventsApi(SAPClass, eventName));
	}

	getMarkupUrlForMethodApi(SAPClass: AbstractUIClass | SAPNode, methodName: string) {
		return this.wrapInMarkup(this.getUrlForMethodApi(SAPClass, methodName));
	}

	getUrlForClassApi(SAPClass: SAPNode | AbstractUIClass) {
		const className = SAPClass instanceof SAPNode ? SAPClass.getName() : SAPClass instanceof AbstractUIClass ? SAPClass.className : "";

		return this.getUrlClassApiBase(className);
	}

	getUrlForPropertiesApi(SAPClass: AbstractUIClass) {
		const urlBase = this.getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/controlProperties`;
	}

	geUrlForEventsApi(SAPClass: AbstractUIClass, eventName: string) {
		const urlBase = this.getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/events/${eventName}`;
	}

	geUrlForAggregationApi(SAPClass: AbstractUIClass) {
		const urlBase = this.getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/aggregations`;
	}

	geUrlForAssociationApi(SAPClass: AbstractUIClass) {
		const urlBase = this.getUrlClassApiBase(SAPClass.className);
		return `${urlBase}/associations`;
	}

	getUrlForMethodApi(SAPClass: AbstractUIClass | SAPNode, methodName: string) {
		const className = SAPClass instanceof SAPNode ? SAPClass.getName() : SAPClass instanceof AbstractUIClass ? SAPClass.className : "";
		const urlBase = this.getUrlClassApiBase(className);
		return `${urlBase}/methods/${methodName}`;
	}

	getAPIIndexUrl() {
		return `${this.getUrlBase()}/docs/api/api-index.json`;
	}

	getDesignTimeUrlForLib(libDotNotation: string) {
		const libPath = libDotNotation.replace(/\./g, "/");

		return `${this.getUrlBase()}/test-resources/${libPath}/designtime/apiref/api.json`;
	}

	getIconURIs() {
		return [
			`${this.getUrlBase()}/test-resources/sap/m/demokit/iconExplorer/webapp/model/SAP-icons/groups.json`,
			`${this.getUrlBase()}/test-resources/sap/m/demokit/iconExplorer/webapp/model/SAP-icons-TNT/groups.json`,
			`${this.getUrlBase()}/test-resources/sap/m/demokit/iconExplorer/webapp/model/BusinessSuiteInAppSymbols/groups.json`
		];
	}

	private wrapInMarkup(url: string) {
		return `[UI5 API](${url})\n`;
	}

	private getUrlClassApiBase(className: string) {
		return `${this.getUrlBase()}#/api/${className}`;
	}

	private getUrlBase() {
		return `${this.URLHost}${this.UI5Version}`;
	}
}