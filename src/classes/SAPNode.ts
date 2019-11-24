import { UI5Metadata } from "./UI5Metadata";
import { UI5MetadataDAO } from "./DAO/UI5MetadataDAO";
export class SAPNode {
	public node:any;
	public metadata:UI5Metadata | undefined;
	public nodes:SAPNode[] = [];
	constructor(node: any) {
		this.node = node;

		this.fillNodes();
	}

	private fillNodes() {
		if (this.node.nodes) {
			for (let node of this.node.nodes) {
				var newNode = new SAPNode(node);
				this.nodes.push(newNode);
			}
		}
	}

	public findNode(name: string) {
		let node: SAPNode = this;
		if (this.getName() !== name) {
			for (let myNode of this.nodes) {
				node = myNode.findNode(name);
				if (node.getName() === name) {
					break;
				}
			}
		}

		return node;
	}

	public getName() {
		return this.node.name;
	}

	public getLib() {
		return this.node.lib;
	}

	public getKind() {
		return this.node.kind;
	}

	public getDisplayName() {
		return this.node.displayName || this.node.name.split(".")[this.node.name.split(".").length - 1];
	}

	public getIsDepricated() {
		return this.node.bIsDeprecated;
	}

	public async getMetadataProperties() {
		let metadata = await this.getMetadata();
		return metadata.getUI5Metadata().properties
	}

	public async getMetadataAggregations() {
		let metadata = await this.getMetadata();
		let UI5Metadata: any = metadata.getUI5Metadata();
		return UI5Metadata && UI5Metadata.aggregations ? UI5Metadata.aggregations : null;
	}

	public async getMetadata() {
		if (!this.metadata) {
			let metadataDAO = new UI5MetadataDAO();
			this.metadata = await metadataDAO.getMetadataForNode(this);
		}

		return this.metadata;
	}

	public getMetadataSync() {
		return this.metadata;
	}
}