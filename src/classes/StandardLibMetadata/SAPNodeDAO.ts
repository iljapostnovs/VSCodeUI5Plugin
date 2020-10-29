import { SAPNode } from "./SAPNode";
import * as rp from "request-promise";
import * as vscode from "vscode";
import { FileReader } from "../Util/FileReader";
import { URLBuilder } from "../Util/URLBuilder";

export class SAPNodeDAO {
	private static readonly nodePath: string = URLBuilder.getInstance().getAPIIndexUrl();
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

	public isInstanceOf(classParent: string, classChild: string): boolean {
		let isInstance = classParent === classChild;
		const childNode = this.findNode(classChild);

		const childMetadata = childNode?.getMetadata()?.getRawMetadata();
		if (!isInstance && childMetadata && childMetadata?.extends) {
			isInstance = this.isInstanceOf(classParent, childMetadata?.extends);
		}

		return isInstance;
	}

	public gatAllFlatNodes() {
		let flatNodes: SAPNode[] = [];
		SAPNodeDAO.SAPNodes.forEach(node => {
			flatNodes.push(node);
			if (node.nodes && node.nodes.length > 0) {
				const childrenNodes = this.getContentOfNode(node);
				flatNodes = flatNodes.concat(childrenNodes);
			}
		});

		return flatNodes;
	}

	private getContentOfNode(node: SAPNode) {
		let children: SAPNode[] = [];
		children.push(node);

		if (node.nodes) {
			node.nodes.forEach(node => {
				children = children.concat(this.getContentOfNode(node));
			});
		}


		return children;
	}

	public getAllNodesSync() {
		return SAPNodeDAO.SAPNodes;
	}

	private generateSAPNodes() {
		const libs: any = vscode.workspace.getConfiguration("ui5.plugin").get("libsToLoad");
		const libMap: any = {};
		libs.forEach((lib: any) => {
			libMap[lib] = true;
		});

		for (const node of this.nodes.symbols) {
			if (libMap[node.lib]) {
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
		let correctNode: SAPNode | undefined;

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