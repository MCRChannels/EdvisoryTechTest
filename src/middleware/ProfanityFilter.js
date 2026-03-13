const { filterProfanity } = require("../utils/profanity");

// Filter middleware
function profanityMiddleware(req, res, next) {
    if (["POST", "PUT", "PATCH"].includes(req.method) && req.body) {

        if (req.body.note && typeof req.body.note === "string") {
            req.body.note = filterProfanity(req.body.note);
        }

        if (req.body.name && typeof req.body.name === "string") {
            req.body.name = filterProfanity(req.body.name);
        }
    }
    next();
}

module.exports = { profanityMiddleware };
