import { UI5Metadata } from "./UI5Metadata";
import { UI5MetadataDAO } from "./UI5MetadataDAO";
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
			for (const node of this.node.nodes) {
				const newNode = new SAPNode(node);
				this.nodes.push(newNode);
			}
		}
	}

	public findNode(name: string) {
		let node: SAPNode = this;
		if (this.getName() !== name) {
			for (const myNode of this.nodes) {
				node = myNode.findNode(name);
				if (node.getName() === name) {
					break;
				}
			}
		}

		return node;
	}

	public getName() : string {
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

	public getMetadataProperties() {
		const metadata = this.getMetadataSync();
		return metadata?.getUI5Metadata()?.properties || [];
	}

	public getMetadataAggregations() {
		const metadata = this.getMetadataSync();
		const UI5Metadata: any = metadata?.getUI5Metadata();
		return UI5Metadata?.aggregations || [];
	}

	public async getMetadata() {
		if (!this.metadata) {
			const metadataDAO = new UI5MetadataDAO();
			this.metadata = await metadataDAO.getMetadataForNode(this);
		}

		return this.metadata;
	}

	public getMetadataSync() {
		return this.metadata;
	}
}