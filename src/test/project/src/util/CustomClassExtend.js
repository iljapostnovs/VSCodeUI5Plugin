sap.ui.define([
	"com/test/util/CustomClass"
], function(
	CustomClass
) {
	"use strict";

	const CustomClassExtend = CustomClass.extend("com.test.util.CustomClassExtend", {
        metadata: {
			properties: {
				dialogTitleExtended: {
					type: "string",
					defaultValue: null
				}
			},
			aggregations: {
				listBindingTemplateExtended: {
					type: "sap.m.ListItemBase",
					multiple: false
				}
			},
			associations: {
				multiInputExtended: {
					type: "sap.m.MultiInput",
					multiple: false
				}
			},
			events: {
				showExtended: {
					parameters: {
						message: { type: "string" }
					}
				}
			}
		},
        customMethodExtended: function() {
			//
			return this.staticTest();
        }
	});

	/**
	 * @param {sap.m.Text} var1 var 1
	 * @param {sap.m.Dialog} var2 var2
	 */
	CustomClassExtend.staticTest = (var1, var2) => {
		return sap.m.Dialog;
	}

	/**
	 * @returns {sap.m.Text} instance
	 */
	CustomClassExtend.prototype.instanceTest = function() {
		return sap.m.Text;
	}

	CustomClassExtend.prototype.staticTest2 = "asd";

	return CustomClassExtend;
});