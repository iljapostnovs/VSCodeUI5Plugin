sap.ui.define([
	"com/test/Component"
], function(
	Component
) {
	"use strict";
	return Component.extend("com.extend.Component", {
		metadata: {
			manifest: "json"
		},

		init: function() {
			Component.prototype.init.apply(this, arguments);

			this.getRouter().initialize();
		}
	});
});