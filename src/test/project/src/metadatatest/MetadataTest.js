sap.ui.define([
    "sap/ui/base/ManagedObject",
	"sap/m/Text"
], function (
	ManagedObject,
	Text
) {
	"use strict";

	return ManagedObject.extend("com.test.metadatatest.MetadataTest", {
		"metadata": {
			"properties": {
				"dialogTitle": {
					"type": "string",
					"defaultValue": null
				},
				"searchFieldPlaceholder": {
					"type": "string",
					"defaultValue": null
				}
			},
			"aggregations": {
				"listBindingTemplate": {
					"type": "sap.m.ListItemBase",
					"multiple": false
				},
				"multipleTests": {
					"type": "sap.m.Text",
					"multiple": true,
					"singularName": "multipleTest"
				}
			},
			"associations": {
				"multiInput": {
					"type": "sap.m.MultiInput",
					"multiple": false
				}
			},
			"events": {
				"show": {
					"parameters": {
						"message": { "type": "string" }
					}
				}
			}
		},
        customMethod: function() {
			this._customField = new Text();
			//

			this.multipletest
			return this._customField;
        }
	});
});