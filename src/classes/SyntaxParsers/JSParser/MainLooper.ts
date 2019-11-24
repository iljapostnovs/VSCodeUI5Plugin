import { JSFunctionCall } from "./types/FunctionCall";
import { AbstractType } from "./types/AbstractType";
import { JSArray } from "./types/Array";
import { JSString } from "./types/String";
import { JSFunction } from "./types/Function";
import { JSObject } from "./types/Object";
import { JSClass } from "./types/Class";
import { JSVariable } from "./types/Variable";
import { IfStatement } from "./types/IfStatement";
import { WhileLoop } from "./types/WhileLoop";
import { ForLoop } from "./types/ForLoop";
import { TryCatchFinally } from "./types/TryCatchFinally";
import { JSSwitch } from "./types/JSSwitch";
import { JSComment } from "./types/JSComment";
import { JSUnknown } from "./types/JSUnknown";
import { JSTernaryOperation } from "./types/TernaryOperation";

export class MainLooper {
	static startAnalysing(javascript: string, runBeforeChar?: string) {
		let currentText = "";
		let shouldContinueLoop = true;
		let currentIndex = 0;
		let parts:AbstractType[] = [];
		let emergencyStop = false;
		const rIsVariable = /(var\s)?(.*=)|this\..*\s=|var\s.*?(?=;)/;

		while (shouldContinueLoop) {
			const currentChar = javascript[currentIndex];
			let body;
			if (currentText.indexOf("new ") > -1 && currentChar === "(") {
				//needed before function call
				body =  this.getEndOfChar("(", ")", javascript.substring(currentIndex, javascript.length));

				const jsClass = new JSClass(currentText, body);
				parts.push(jsClass);

				javascript = javascript.substring(jsClass.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsClass.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (currentText.indexOf("function") > -1) {
				//need to be before Function Call
				let params =  this.getEndOfChar("(", ")", javascript.substring(currentIndex, javascript.length));
				body =  this.getEndOfChar("{", "}", javascript.substring(currentIndex, javascript.length));

				const functionText = javascript.substring(0, javascript.indexOf(body) + body.length);
				const jsFunction = new JSFunction(currentText, body, params, functionText);
				parts.push(jsFunction);

				javascript = javascript.substring(jsFunction.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsFunction.functionText.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (/\sif(\s|\()/.test(currentText)) {
				const jsIfStatement = new IfStatement("", javascript);
				parts.push(jsIfStatement);

				javascript = javascript.substring(jsIfStatement.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsIfStatement.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (currentText.endsWith("=") && javascript[currentIndex + 1] === "=") {
				const jsTernaryOperation = new JSTernaryOperation("", javascript);
				parts.push(jsTernaryOperation);

				javascript = javascript.substring(jsTernaryOperation.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsTernaryOperation.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (/\swhile(\s|\()/.test(currentText)) {
				const jsWhileLoop = new WhileLoop("", javascript);
				parts.push(jsWhileLoop);

				javascript = javascript.substring(jsWhileLoop.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsWhileLoop.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (/\sfor(\s|\()/.test(currentText)) {
				const jsForLoop = new ForLoop("", javascript);
				parts.push(jsForLoop);

				javascript = javascript.substring(jsForLoop.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsForLoop.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (/\stry(\s|{)/.test(currentText)) {
				const jsTryCatchFinally = new TryCatchFinally("", javascript);
				parts.push(jsTryCatchFinally);

				javascript = javascript.substring(jsTryCatchFinally.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsTryCatchFinally.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (/\sswitch(\s|{)/.test(currentText)) {
				const jsSwitch = new JSSwitch("", javascript);
				parts.push(jsSwitch);

				javascript = javascript.substring(jsSwitch.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsSwitch.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (currentText.endsWith("/*") || currentText.endsWith("//")) {
				const jsComment = new JSComment("", javascript);
				parts.push(jsComment);

				javascript = javascript.substring(jsComment.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

			} else if (currentChar === "(") {
				body = this.getEndOfChar("(", ")", javascript.substring(currentIndex, javascript.length));
				const jsFunctionCall = new JSFunctionCall(currentText, body);
				parts.push(jsFunctionCall);

				javascript = javascript.substring(jsFunctionCall.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsFunctionCall.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (currentChar === "[") {
				body = this.getEndOfChar("[", "]", javascript.substring(currentIndex, javascript.length));
				const jsArray = new JSArray(currentText, body);
				parts.push(jsArray);

				javascript = javascript.substring(jsArray.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsArray.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (currentChar === "{") {
				body = this.getEndOfChar("{", "}", javascript.substring(currentIndex, javascript.length));
				const jsObject = new JSObject(currentText, body);
				parts.push(jsObject);

				javascript = javascript.substring(jsObject.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsObject.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (currentChar === '"' || currentChar === "'" || currentChar === "`") {
				body = this.getCharPair(currentChar, javascript.substring(currentIndex, javascript.length));
				const jsString = new JSString("", currentText + body);
				parts.push(jsString);

				javascript = javascript.substring(jsString.getContentLength(), javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsString.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else if (rIsVariable.test(currentText)) {
				let definitions;
				let definitionBody;
				if (!currentText.endsWith(";")) {
					definitions = this.startAnalysing(javascript.substring(currentIndex, javascript.length), ";");//think about formatter: Formatter,
					definitionBody = definitions.reduce((accumulator, definition) => accumulator += definition.getFullBody(), "");
				} else {
					currentText = currentText.substring(0, currentText.length - 1);
				}
				const jsVariable = new JSVariable(currentText, definitionBody || "");
				parts.push(jsVariable);

				javascript = javascript.substring(currentText.length + (definitionBody ? definitionBody.length : 0) + 1, javascript.length);
				currentIndex = 0;
				currentText = "";

				if (runBeforeChar && jsVariable.body.endsWith(runBeforeChar)) {
					emergencyStop = true;
				}
			} else {
				currentText += currentChar;
				currentIndex++;
			}

			shouldContinueLoop = emergencyStop ? false : (runBeforeChar ? (currentIndex < javascript.length && (currentText ? currentText[currentText.length - 1] !== runBeforeChar : true) ) : (currentIndex < javascript.length));
		}

		if (javascript && currentText && parts.length === 0) {
			// parts.push(new JSUnknown(currentText, ""));
			if (currentText.split(",").length > 1 && !!currentText.split(",")[1]) {
				parts.push(new JSUnknown(currentText, ""));
			} else {
				parts.push(new JSVariable(currentText, ""));
			}
		} else if (javascript && currentText.trim()) {
			parts.push(new JSUnknown(currentText, ""));
		}

		parts.forEach(part => {
			part.parseBody();
		});
		return parts;
	}

	static getEndOfChar(charBegin: string, charEnd:string, text: string) {
		let body: string = "";
		let charOpened = false;
		let charBeginQuantity = 0;
		let charEndQuantity = 0;
		let openingCharIndex = 0;
		let index = 0;

		while((!charOpened || (charBeginQuantity - charEndQuantity !== 0)) && index < text.length) {
			if (text[index] === charBegin) {
				if (!charOpened) {
					charOpened = true;
					openingCharIndex = index;
				}
				charBeginQuantity++;
			} else if (text[index] === charEnd) {
				charEndQuantity++;
			}
			index++;
		}

		if (text[index] === ";" || text[index] === ",") {
			index++;
		}
		body = text.substring(openingCharIndex, index);

		return body;
	}

	static getCharPair(char: string, text: string, breakOnEnter?: boolean) {
		let body: string = "";
		let charOpened = false;
		let charQuantity = 0;
		let openingCharIndex = 0;
		let index = 0;

		while((!charOpened || (charQuantity !== 2)) && index < text.length) {
			if (text[index] === char && text[index - 1] !== "\\") {
				if (!charOpened) {
					charOpened = true;
					openingCharIndex = index;
				}
				charQuantity++;
			}

			index++;
		}

		if (text[index] === ";" || text[index] === ",") {
			index++;
		}
		body = text.substring(openingCharIndex, index);

		return body;
	}
}

// arguments	break
// 	case	catch
// const	continue	debugger
// delete	do		else
// 	false		finally
// float	for	function
// if		in	instanceof
// int		let
// 	new	null
// 			return
// 		switch
// this	throw
// true	try	typeof	var
// void	while