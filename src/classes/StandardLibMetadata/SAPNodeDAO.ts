import { SAPNode } from "./SAPNode";
import rp from "request-promise";
import * as vscode from "vscode";
import fs from "fs";
import { FileReader } from "../Util/FileReader";

export class SAPNodeDAO {
	private static nodePath:string = `https://ui5.sap.com/${vscode.workspace.getConfiguration("ui5.plugin").get("ui5version")}/docs/api/api-index.json`;
	private nodes: any;
	private static SAPNodes: SAPNode[] = [];
	constructor() {}

	public async getAllNodes() {
		if (SAPNodeDAO.SAPNodes.length === 0) {
			await this.readAllNodes();
			this.generateSAPNodes();
		}

		return SAPNodeDAO.SAPNodes;
	}

	public getAllNodesSync() {
		return SAPNodeDAO.SAPNodes;
	}

	private generateSAPNodes() {
		const libs: any = {
			"sap.m": true,
			"sap.ui.comp": true,
			"sap.f": true,
			"sap.ui.core": true,
			"sap.ui.commons": true,
			"sap.ui.export": true,
			"sap.ui.layout": true,
			"sap.ui.support": true,
			"sap.ui.table": true,
			"sap.ui.unified": true,
			"sap.ushell": true
		};
		for (const node of this.nodes.symbols) {
			if (libs[node.lib]) {
				const newNode = new SAPNode(node);
				SAPNodeDAO.SAPNodes.push(newNode);
			}
		}
	}

	private async readAllNodes() {
		this.nodes = this.getApiIndexFromCache();
		if (!this.nodes) {
			await this.fetchApiIndex();
			this.cacheApiIndex();
		}
	}

	private getApiIndexFromCache() {
		let cacheFromFile;

		const globalStoragePath = FileReader.globalStoragePath;
		if (globalStoragePath) {
			const cachePath = globalStoragePath + "\\cache_apiindex.json";

			if (fs.existsSync(cachePath)) {
				cacheFromFile = JSON.parse(fs.readFileSync(cachePath, "utf8"));
			}
		}

		return cacheFromFile;
	}

	private cacheApiIndex() {
		const globalStoragePath = FileReader.globalStoragePath;
		if (globalStoragePath) {
			const cachePath = globalStoragePath + "\\cache_apiindex.json";
			if (!fs.existsSync(cachePath)) {
				if (!fs.existsSync(globalStoragePath)) {
					fs.mkdirSync(globalStoragePath);
				}
				fs.writeFileSync(cachePath, "", "utf8");
			}

			const cache = JSON.stringify(this.nodes);
			fs.writeFileSync(cachePath, cache, "utf8");
		}
	}

	private fetchApiIndex() {
		return new Promise((resolve: any, reject: any) => {
			rp(SAPNodeDAO.nodePath)
			.then((data: any) => {
				this.nodes = JSON.parse(data);
				resolve();
			})
			.catch(reject);
		});
	}

	public findNode(name: string) {
		let correctNode: SAPNode = SAPNodeDAO.SAPNodes[0];

		for (const node of SAPNodeDAO.SAPNodes) {
			const theNode: SAPNode = node.findNode(name);
			if (theNode.getName() === name) {
				correctNode = theNode;
				break;
			}
		}

		return correctNode;
	}
}