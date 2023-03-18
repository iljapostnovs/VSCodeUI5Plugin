import Text from "sap/m/Text";
import ManagedObject from "sap/ui/base/ManagedObject";
import Formatter from "./Formatter";

/**
 * @namespace com.test.parser.classparsing
 */
export default class TestClassParsing extends ManagedObject {
	formatter: typeof Formatter = Formatter;
	protected formatterWOType = Formatter;
	private field1 = 123;
	field2: string;
	method1(param1: string) {}
	method2(): Text {
		return new Text();
	}
	static staticMethod() {
		return 123;
	}
	private static privateStaticMethod() {
		return 123;
	}
	private _privateMethod() {}
	protected _protectedMethod() {}
}
