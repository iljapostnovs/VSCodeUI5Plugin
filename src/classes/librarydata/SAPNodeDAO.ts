import * as vscode from "vscode";
import { FileReader } from "../utils/FileReader";
import { URLBuilder } from "../utils/URLBuilder";
import { HTTPHandler } from "../utils/HTTPHandler";
import { SAPNode } from "./SAPNode";
import { UI5MetadataPreloader } from "./UI5MetadataDAO";
interface ILooseNodeObject {
	[key: string]: SAPNode;
}

export class SAPNodeDAO {
	private static readonly _nodePath: string = URLBuilder.getInstance().getAPIIndexUrl();
	private _nodes: any;
	private static readonly _SAPNodes: SAPNode[] = [];
	private static readonly _flatSAPNodes: ILooseNodeObject = {};

	public async getAllNodes() {
		if (SAPNodeDAO._SAPNodes.length === 0) {
			await this._readAllNodes();
			this._generateSAPNodes();
		}

		return SAPNodeDAO._SAPNodes;
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

	private _getContentOfNode(node: SAPNode) {
		let children: SAPNode[] = [];
		children.push(node);

		if (node.nodes) {
			node.nodes.forEach(node => {
				children = children.concat(this._getContentOfNode(node));
			});
		}


		return children;
	}

	public getAllNodesSync() {
		return SAPNodeDAO._SAPNodes;
	}

	private _generateSAPNodes() {
		const libs: any = vscode.workspace.getConfiguration("ui5.plugin").get("libsToLoad");
		const libMap: any = {};
		libs.forEach((lib: any) => {
			libMap[lib] = true;
		});

		for (const node of this._nodes.symbols) {
			if (libMap[node.lib]) {
				const newNode = new SAPNode(node);
				SAPNodeDAO._SAPNodes.push(newNode);
			}
		}

		this._recursiveFlatNodeGeneration(SAPNodeDAO._SAPNodes);

		UI5MetadataPreloader.libsPreloaded.then(this._recursiveModuleAssignment.bind(this));
	}

	private _recursiveModuleAssignment() {
		const nodes = SAPNodeDAO._SAPNodes;
		nodes.forEach(node => {
			if (node.getMetadata()?.getRawMetadata()) {
				const moduleName = node.getMetadata()?.getRawMetadata()?.module?.replace(/\//g, ".");
				if (moduleName !== node.getName()) {
					const moduleNode = this.findNode(moduleName);
					const nodeMetadata = node.getMetadata().getRawMetadata();
					if (moduleNode && nodeMetadata) {

						const rawMetadata = moduleNode.getMetadata().getRawMetadata();
						if (!rawMetadata.properties) {
							rawMetadata.properties = [];
						}
						const property = {
							name: nodeMetadata.name,
							visibility: nodeMetadata.visibility,
							description: nodeMetadata.description,
							type: node.getName()
						}
						rawMetadata.properties.push(property);
					}
				}
			}
		});
	}

	private _recursiveFlatNodeGeneration(nodes: SAPNode[]) {
		nodes.forEach(SAPNode => {
			SAPNodeDAO._flatSAPNodes[SAPNode.getName()] = SAPNode;
			if (SAPNode.nodes) {
				this._recursiveFlatNodeGeneration(SAPNode.nodes);
			}
		});
	}

	private async _readAllNodes() {
		this._nodes = this._getApiIndexFromCache();
		if (!this._nodes) {
			await this._fetchApiIndex();
			this._cacheApiIndex();
		}
	}

	private _getApiIndexFromCache() {
		return FileReader.getCache(FileReader.CacheType.APIIndex);
	}

	private _cacheApiIndex() {
		const cache = JSON.stringify(this._nodes);
		FileReader.setCache(FileReader.CacheType.APIIndex, cache);
	}

	private async _fetchApiIndex() {
		const data: any = await HTTPHandler.get(SAPNodeDAO._nodePath);
		this._nodes = data;
	}

	public findNode(name: string): SAPNode | undefined {
		return SAPNodeDAO._flatSAPNodes[name];
	}

	public getFlatNodes() {
		return SAPNodeDAO._flatSAPNodes;
	}
}