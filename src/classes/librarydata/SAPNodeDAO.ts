import * as vscode from "vscode";
import { FileReader } from "../utils/FileReader";
import { URLBuilder } from "../utils/URLBuilder";
import { HTTPHandler } from "../utils/HTTPHandler";
import { SAPNode } from "./SAPNode";

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

	public isInstanceOf(child: string, parent: string): boolean {
		let isInstance = child === parent;
		const parentNode = this.findNode(parent);

		const parentMetadata = parentNode?.getMetadata()?.getRawMetadata();
		isInstance = isInstance || !!parentMetadata?.implements?.includes(child);
		if (!isInstance && parentMetadata && parentMetadata?.extends) {
			isInstance = this.isInstanceOf(child, parentMetadata?.extends);
		}

		return isInstance;
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

	private async fetchApiIndex() {
		const data: any = await HTTPHandler.get(SAPNodeDAO.nodePath);
		this.nodes = data;
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