import { UI5Metadata } from "./UI5Metadata";
import { UI5MetadataDAO } from "./UI5MetadataDAO";
export class SAPNode {
	public node: any;
	public metadata: UI5Metadata | undefined;
	public nodes: SAPNode[] = [];

	public static readonly metadataDAO = new UI5MetadataDAO();
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

	public getIsDeprecated() {
		return this.node.bIsDeprecated;
	}

	public getFields() {
		const metadata = this.getMetadata();
		const rawMetadata = metadata?.getRawMetadata();
		const fields = rawMetadata?.properties?.filter((field: any) => !field.deprecatedText && (field.visibility === "public" || field.visibility === "protected"));
		fields?.forEach((field: any) => {
			field.name = field.name.replace(rawMetadata?.name + "." || "", "");
		});

		return fields || [];
	}

	public getProperties(): any[] {
		const metadata = this.getMetadata();
		const properties = metadata?.getUI5Metadata()?.properties?.filter((property: any) => !property.deprecatedText && (property.visibility === "public" || property.visibility === "protected"));
		return properties || [];
	}

	public getAggregations(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getUI5Metadata();
		return UI5Metadata?.aggregations?.filter((aggregation: any) => !aggregation.deprecated && (aggregation.visibility === "public" || aggregation.visibility === "protected")) || [];
	}

	public getEvents(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getRawMetadata();
		return UI5Metadata?.events?.filter((event: any) => !event.deprecated && event.visibility === "public") || [];
	}

	public getAssociations(): any[] {
		const metadata = this.getMetadata();
		const UI5Metadata: any = metadata?.getUI5Metadata();
		return UI5Metadata?.associations?.filter((association: any) => !association.deprecated && association.visibility === "public") || [];
	}

	public getMethods(): any[] {
		const metadata = this.getMetadata();
		const rawMetadata: any = metadata?.getRawMetadata();
		return rawMetadata?.methods?.filter((method: any) => !method.deprecated && (method.visibility === "public" || method.visibility === "protected")) || [];
	}

	public getMetadata() {
		if (!this.metadata) {
			this.metadata = SAPNode.metadataDAO.getPreloadedMetadataForNode(this);
		}

		return this.metadata;
	}
}