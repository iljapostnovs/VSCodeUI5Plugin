import { SAPNode } from "./SAPNode";
import rp from "request-promise";
import { FileReader } from "../Util/FileReader";
import { URLBuilder } from "../Util/URLBuilder";

export class SAPNodeDAO {
	private static readonly nodePath:string = URLBuilder.getInstance().getAPIIndexUrl();
	private nodes: any;
	private static readonly SAPNodes: SAPNode[] = [];
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
		return FileReader.getCache(FileReader.CacheType.APIIndex);
	}

	private cacheApiIndex() {
		const cache = JSON.stringify(this.nodes);
		FileReader.setCache(FileReader.CacheType.APIIndex, cache);
	}

	private fetchApiIndex() {
		return new Promise((resolve: any, reject: any) => {
			const proxy = process.env.PROXY_HTTP || process.env.PROXY_HTTPS;
			const options = proxy ? {
				proxy: proxy
			} : undefined;

			rp(SAPNodeDAO.nodePath, options)
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