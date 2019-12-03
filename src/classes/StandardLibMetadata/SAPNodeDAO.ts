import { SAPNode } from "./SAPNode";
import * as rp from "request-promise";
import * as vscode from "vscode";

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
				let newNode = new SAPNode(node);
				SAPNodeDAO.SAPNodes.push(newNode);
			}
		}
	}

	private readAllNodes() {
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
			let theNode: SAPNode = node.findNode(name);
			if (theNode.getName() === name) {
				correctNode = theNode;
				break;
			}
		}

		return correctNode;
	}
}