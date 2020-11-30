import { FileReader } from "../utils/FileReader";
import { HTTPHandler } from "../utils/HTTPHandler";
import { URLBuilder } from "../utils/URLBuilder";

export class SAPIcons {
	public static icons: string[] = [];

	static async preloadIcons() {
		this.icons = FileReader.getCache(FileReader.CacheType.Icons);
		if (!this.icons) {
			this.icons = await this.loadIcons();
			FileReader.setCache(FileReader.CacheType.Icons, JSON.stringify(this.icons));
		}
	}

	private static async loadIcons() {
		const uris: string[] = URLBuilder.getInstance().getIconURIs();
		let icons: string[] = [];
		const aIconResponses = await Promise.all(uris.map(uri => this.requestJSONData(uri)));
		aIconResponses.forEach((iconResponse: any) => {
			let uniqueIcons: any[] = [];
			iconResponse.groups.forEach((group: any) => {
				uniqueIcons = uniqueIcons.concat(group.icons);
			});

			uniqueIcons = uniqueIcons.map(icon => `sap-icon://${icon.name}`);

			icons = icons.concat(uniqueIcons);
		});

		icons = [...new Set(icons)];

		return icons;
	}

	private static async requestJSONData(uri: string) {
		const data: any = await HTTPHandler.get(uri);

		return data;
	}
}