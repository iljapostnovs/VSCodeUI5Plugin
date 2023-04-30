export interface TSODataInterfacesFetchingData {
	username?: string;
	password?: string;
	url?: string;
}
export interface IXMLSourcePrompt<T = string[]> {
	getXMLMetadataText(): Promise<T>;
}
