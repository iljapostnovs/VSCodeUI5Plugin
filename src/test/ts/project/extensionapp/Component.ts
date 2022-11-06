import CustomComponent from "../src/Component";

/**
 * @namespace com.extend
 */
export default class Component extends CustomComponent {
	metadata = {
		manifest: "json"
	};

	init() {
		super.init();

		this.getRouter().initialize();
	}
}
