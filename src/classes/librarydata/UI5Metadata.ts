export class UI5Metadata {
	public rawMetadata: any;
	constructor(metadata: any) {
		this.rawMetadata = metadata;
	}

	public getUI5Metadata(): any | undefined {
		return this.rawMetadata && this.rawMetadata["ui5-metadata"];
	}

	public getRawMetadata() {
		return this.rawMetadata;
	}
}