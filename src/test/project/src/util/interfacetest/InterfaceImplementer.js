sap.ui.define([
	"sap/ui/base/ManagedObject",
	"com/test/util/interfacetest/interfaces/Interface1",
	"com/test/util/interfacetest/interfaces/Interface2"
], function(
	ManagedObject,
	Interface1,
	Interface2
) {
	"use strict";

	return ManagedObject.extend("com.test.util.interfacetest.InterfaceImplementer", {
		metadata: {
			interfaces: ["com.test.util.interfacetest.interfaces.Interface3"]
		},
		customMetadata: {
			interfaces: [Interface1, Interface2]
		}
	});
});