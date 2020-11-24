import { UI5Metadata } from "./UI5Metadata";
import { SAPNode } from "./SAPNode";
import * as rp from "request-promise";
import { URLBuilder } from "../utils/URLBuilder";
import { FileReader } from "../utils/FileReader";
import { UI5Plugin } from "../../UI5Plugin";

interface LooseObject {
	[key: string]: any;
}

let namespaceDesignTimes: LooseObject = {};

export class UI5MetadataPreloader {
	private readonly libNames: LooseObject = {};
	private readonly nodes: SAPNode[];
	constructor(nodes: SAPNode[]) {
		this.nodes = nodes;
	}

	public async preloadLibs() {
		var cache = this.loadCache();
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
					UI5Plugin.getInstance().initializationProgress?.report({
						message: i,
						increment: incrementStep
					});
				}));
			}

			return Promise.all(promises).then(() => {
				cache = namespaceDesignTimes;
				this.writeCache();
			});
		} else {
			namespaceDesignTimes = cache;
			UI5Plugin.getInstance().initializationProgress?.report({
				increment: 50
			});
			return new Promise(resolve => resolve(cache));
		}
	}

	private loadCache() {
		return FileReader.getCache(FileReader.CacheType.Metadata);
	}

	private writeCache() {
		const cache = JSON.stringify(namespaceDesignTimes);
		FileReader.setCache(FileReader.CacheType.Metadata, cache);
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

	public getPreloadedMetadataForNode(node: SAPNode) {
		const libMetadata = namespaceDesignTimes[node.getLib()];
		const metadata = this.findNodeMetadata(node, libMetadata);

		return new UI5Metadata(metadata);
	}

	private findNodeMetadata(node: SAPNode, libMetadata: any) {
		return libMetadata?.symbols ? libMetadata.symbols.find(
			(metadata: any) => metadata.name === node.getName()
		) : {};
	}

	public async getMetadataForLib(lib: string) {
		let metadata;
		try {
			metadata = await this.fetchMetadataForLib(lib);
		} catch (error) {
			console.log(error);
		}

		return metadata;
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
				setTimeout(() => {
					const readPath: string = URLBuilder.getInstance().getDesignTimeUrlForLib(lib);
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
				}, Math.round(Math.random() * 150));
			}
		});
	}
}