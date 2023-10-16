import { fastXmlParser } from "ui5plugin-parser";
import { AXMLMetadataParser } from "./AXMLMetadataParser";
import { XMLMetadataParser } from "./XMLMetadataParser";
import { XMLMetadataParserV4 } from "./XMLMetadataParserV4";

export default class MetadataParserFactory {
	static getInstance(metadata: string): AXMLMetadataParser {
		const parsedXML = new fastXmlParser.XMLParser({
			ignoreAttributes: false
		}).parse(metadata);
		const edmx = parsedXML["edmx:Edmx"];

		if (edmx["@_Version"] === "4.0") {
			return new XMLMetadataParserV4(metadata);
		} else {
			return new XMLMetadataParser(metadata);
		}
	}
}
