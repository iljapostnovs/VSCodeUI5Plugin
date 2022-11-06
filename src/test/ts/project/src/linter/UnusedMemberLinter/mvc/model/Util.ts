import ManagedObject from "sap/ui/base/ManagedObject";

/**
 * @namespace com.test.linter.UnusedMemberLinter.mvc.model
 */
export default class Util extends ManagedObject {
	usedMethod() { }
	unusedMethod() { }
	usedInFragment1() { }
	usedInFragment2() { }
	usedInFragment3() { }
}