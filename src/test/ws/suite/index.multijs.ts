import path = require("path");
import { run as abstractRun } from "../../abstract/TestLoader";

const testRoot = path.resolve(__dirname, "../..");
const run = abstractRun.bind(this, testRoot, "**/**.multijs.test.js");
export = { run };
