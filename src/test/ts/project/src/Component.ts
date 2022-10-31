import UIComponent from "sap/ui/core/UIComponent";

/**
 * @namespace com.test
 */
export default class Component extends UIComponent {
	metadata: {
		manifest: "json"
	}

	init() {
		super.init();

		this.getRouter().initialize();
	}
}
