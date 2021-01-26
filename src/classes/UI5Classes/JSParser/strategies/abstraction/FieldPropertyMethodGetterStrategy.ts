import {FieldsAndMethods} from "../../../UIClassFactory";

export abstract class FieldPropertyMethodGetterStrategy {
	abstract getFieldsAndMethods(): FieldsAndMethods | undefined;
}