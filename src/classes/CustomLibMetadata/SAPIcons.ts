import { FileReader } from "../Util/FileReader";
import { URLBuilder } from "../Util/URLBuilder";
import rp from "request-promise";

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

	private static requestJSONData(uri: string) {
		return new Promise((resolve, reject) => {
			const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
			const options: rp.RequestPromiseOptions | undefined = proxy ? {
				proxy: proxy
			} : undefined;

			rp(uri, options)
			.then((data: any) => {
				try {
					data = JSON.parse(data);
					resolve(data);
				} catch (error) {
					reject(error);
				}
			})
			.catch(reject);
		});
	}
}