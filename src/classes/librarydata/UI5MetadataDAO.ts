import { URLBuilder } from "../utils/URLBuilder";
import { FileReader } from "../utils/FileReader";
import { UI5Plugin } from "../../UI5Plugin";
import { HTTPHandler } from "../utils/HTTPHandler";
import { SAPNode } from "./SAPNode";
import { UI5Metadata } from "./UI5Metadata";

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
				setTimeout(async () => {
					const readPath: string = URLBuilder.getInstance().getDesignTimeUrlForLib(lib);
					namespaceDesignTimes[lib] = HTTPHandler.get(readPath);
					try {
						namespaceDesignTimes[lib] = await namespaceDesignTimes[lib];
						resolve(namespaceDesignTimes[lib]);
					} catch (error) {
						reject(error);
					}
				}, Math.round(Math.random() * 150));
			}
		});
	}
}