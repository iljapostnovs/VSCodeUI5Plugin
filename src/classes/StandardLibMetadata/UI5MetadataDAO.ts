import { UI5Metadata } from "./UI5Metadata";
import { SAPNode } from "./SAPNode";
import rp from "request-promise";
import * as vscode from "vscode";
import * as fs from "fs";

interface LooseObject {
	[key: string]: any;
}

const namespaceDesignTimes: LooseObject = {};

export class UI5MetadataPreloader {
	private libNames: LooseObject = {};
	private nodes: SAPNode[];
	constructor(nodes: SAPNode[]) {
		this.nodes = nodes;
	}

	public async preloadLibs(progress: vscode.Progress<{ message?: string | undefined; increment?: number | undefined; }>, context: vscode.ExtensionContext) {
		var cache = this.loadCache(context);
		if (!cache) {
			const promises = [];
			const metadataDAO = new UI5MetadataDAO();
			this.nodes.forEach((node: SAPNode) => {
				this.getUniqueLibNames(node);
			});
			const libQuantity = Object.keys(this.libNames).length;
			const incrementStep = 50 / libQuantity;

			for (const i in this.libNames) {
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
		const UIVersion: any = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
		const cachePath = `${context.globalStoragePath}\\cache_${UIVersion}.json`;
		let cacheFromFile;

		if (fs.existsSync(cachePath)) {
			cacheFromFile = JSON.parse(fs.readFileSync(cachePath, "utf8"));
		}

		return cacheFromFile;
	}

	private writeCache(context: vscode.ExtensionContext) {
		const UIVersion: any = vscode.workspace.getConfiguration("ui5.plugin").get("ui5version");
		const cachePath = `${context.globalStoragePath}\\cache_${UIVersion}.json`;
		if (!fs.existsSync(cachePath)) {
			if (!fs.existsSync(context.globalStoragePath)) {
				fs.mkdirSync(context.globalStoragePath);
			}
			fs.writeFileSync(cachePath, "", "utf8");
		}

		const cache = JSON.stringify(namespaceDesignTimes);
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
		const libMetadata = await this.getMetadataForLib(node.getLib());
		const metadata = this.findNodeMetadata(node, libMetadata);

		return new UI5Metadata(metadata);
	}

	private findNodeMetadata(node: SAPNode, libMetadata: any) {
		return libMetadata.symbols ? libMetadata.symbols.find(
			(metadata: any) => metadata.name === node.getName()
		) : {};
	}

	public async getMetadataForLib(lib: string) {
		let metadatas;
		try {
			metadatas = await this.fetchMetadataForLib(lib);
		} catch (error) {
			console.log(error);
		}

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
				const readPath: string = `https://ui5.sap.com/${vscode.workspace.getConfiguration("ui5.plugin").get("ui5version")}/test-resources/${lib.replace(/\./g, "/")}/designtime/apiref/api.json`;
				const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
				const options: rp.RequestPromiseOptions | undefined = proxy ? {
					proxy: proxy
				} : undefined;

				namespaceDesignTimes[lib] = rp(readPath, options)
				.then((data: any) => {
					try {
						namespaceDesignTimes[lib] = JSON.parse(data);
						resolve(namespaceDesignTimes[lib]);
					} catch (error) {
						console.log(lib);
					}
				})
				.catch(reject);
			}
		});
	}
}