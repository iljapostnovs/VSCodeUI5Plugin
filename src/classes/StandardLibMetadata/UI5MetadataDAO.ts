import { UI5Metadata } from "./UI5Metadata";
import { SAPNode } from "./SAPNode";
import * as rp from "request-promise";
import * as vscode from "vscode";
import * as fs from "fs";

interface LooseObject {
	[key: string]: any
}
var namespaceDesignTimes: LooseObject = {};
var cache: any = null;

export class UI5MetadataPreloader {
	private libNames: LooseObject = {};
	private nodes: SAPNode[];
	constructor(nodes: SAPNode[]) {
		this.nodes = nodes;
	}

	public async preloadLibs(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, context: vscode.ExtensionContext) {
		var cache = this.loadCache(context);
		if (!cache) {
			let promises = [];
			let metadataDAO = new UI5MetadataDAO();
			this.nodes.forEach((node: SAPNode) => {
				this.getUniqueLibNames(node);
			});
			let libQuantity = Object.keys(this.libNames).length;
			let incrementStep = 50 / libQuantity;

			for (let i in this.libNames) {
				promises.push(metadataDAO.getMetadataForLib(i).then(() => {
					progress.report({ increment: incrementStep});
				}));
			}

			return Promise.all(promises).then(() => {
				cache = namespaceDesignTimes;
				this.writeCache(context);
			});
		} else {
			progress.report({ increment: 50 });
			return new Promise(resolve => resolve(cache));
		}
	}

	private loadCache(context: vscode.ExtensionContext) {
		let cachePath = context.globalStoragePath + "\\cache.json";
		let cacheFromFile;

		if (fs.existsSync(cachePath)) {
			cacheFromFile = JSON.parse(fs.readFileSync(cachePath, "utf8"));
		}

		return cacheFromFile;
	}

	private writeCache(context: vscode.ExtensionContext) {
		let cachePath = context.globalStoragePath + "\\cache.json";;
		if (!fs.existsSync(cachePath)) {
			if (!fs.existsSync(context.globalStoragePath)) {
				fs.mkdirSync(context.globalStoragePath);
			}
			fs.writeFileSync(cachePath, "", "utf8");
		}

		let cache = JSON.stringify(namespaceDesignTimes);
		fs.writeFileSync(cachePath, cache, "utf8");
	}

	private getUniqueLibNames(node: SAPNode) {
		this.libNames[node.getLib()] = "";
		if (node.nodes) {
			node.nodes.forEach(this.getUniqueLibNames, this);
		}
	}
}
export class UI5MetadataDAO {
	constructor() {}

	public async getMetadataForNode(node: SAPNode) {
		let libMetadata = await this.getMetadataForLib(node.getLib());
		let metadata = this.findNodeMetadata(node, libMetadata);

		return new UI5Metadata(metadata);
	}

	private findNodeMetadata(node: SAPNode, libMetadata: any) {
		return libMetadata.symbols ? libMetadata.symbols.find(
			(metadata: any) => metadata.name === node.getName()
		) : {};
	}

	public async getMetadataForLib(lib: string) {
		let metadatas = await this.fetchMetadataForLib(lib);

		return metadatas;
	}

	private fetchMetadataForLib(lib: string) {
		return new Promise((resolve, reject) => {
			if (namespaceDesignTimes[lib]) {
				if (namespaceDesignTimes[lib].then) {
					namespaceDesignTimes[lib].then(() => {
						resolve(namespaceDesignTimes[lib]);
					});
				} else {
					resolve(namespaceDesignTimes[lib]);
				}
			} else {
				let readPath: string = `https://ui5.sap.com/${vscode.workspace.getConfiguration("ui5.plugin").get("ui5version")}/test-resources/${lib.replace(/\./g, "/")}/designtime/apiref/api.json`;
				namespaceDesignTimes[lib] = rp(readPath)
				.then((data: any) => {
					try {
						namespaceDesignTimes[lib] = JSON.parse(data);
						resolve(namespaceDesignTimes[lib]);
					} catch (error) {
						console.log(lib)
					}
				})
				.catch(reject);
			}
		});
	}
}