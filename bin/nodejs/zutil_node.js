var z = require("./base.js");
require("./arrays.js")(z);
require("./assert.js")(z);
require("./check.js")(z);
require("./convert.js")(z);
require("./events.js")(z);
require("./functions.js")(z);
require("./log.js")(z);
require("./numbers.js")(z);
require("./objects.js")(z);
require("./stopwatch.js")(z);
require("./unitTests.js")(z);
z.setup({
	useArrayExtensions: true,
	useFunctionExtensions: true,
	// useGeneratorExtensions: true,
	useNumberExtensions: true,
	useObjectExtensions: true,
	defaultLogger: console
});
module.exports = z;