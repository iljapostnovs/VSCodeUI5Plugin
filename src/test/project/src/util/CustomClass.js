sap.ui.define([
    "sap/ui/base/ManagedObject",
	"sap/m/Text"
], function (
	ManagedObject,
	Text
) {
	"use strict";

	return ManagedObject.extend("com.test.util.CustomClass", {
		metadata: {
			properties: {
				dialogTitle: {
					type: "string",
					defaultValue: null
				},
				searchFieldPlaceholder: {
					type: "string",
					defaultValue: null
				}
			},
			aggregations: {
				listBindingTemplate: {
					type: "sap.m.ListItemBase",
					multiple: false
				},
				listBindingTemplate2: {
					type: "sap.m.ListItemBase",
					multiple: false
				}
			},
			associations: {
				multiInput: {
					type: "sap.m.MultiInput",
					multiple: false
				}
			},
			events: {
				show: {
					parameters: {
						message: { type: "string" }
					}
				}
			}
		},
        customMethod: function() {
			this._customField = new Text();
			//

			return this._customField;
        }
	});
});