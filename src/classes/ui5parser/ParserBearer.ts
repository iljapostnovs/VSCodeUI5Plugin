import { IUI5Parser } from "ui5plugin-parser/dist/parser/abstraction/IUI5Parser";

export interface IParserBearer<Parser extends IUI5Parser = IUI5Parser> {
	_parser: Parser;
}

export default abstract class ParserBearer<Parser extends IUI5Parser = IUI5Parser> {
	protected _parser: Parser;
	constructor(parser: Parser) {
		this._parser = parser;
	}
}
