import BaseController from "./BaseController";

/**
 * @namespace com.test.linter.UnusedMemberLinter.mvc.controller
 */
export default class UnusedMemberLinter extends BaseController {
	unusedField = 123;
	usedField = 123;
	usedMethod() {
		"com.test.linter.UnusedMemberLinter.mvc.view.UnusedMemberLinter2";
		this.usedMethod2();
		this.usedField = 123;
	}
	usedMethod2() { }
	unusedMethod() { }
	static usedStatic() { }
	static unusedStatic() { }
}