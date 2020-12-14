var BASE_URL = "https://nm.je/"

exports.handler = function (event, context, callback) {
    var body = event.body;

    var bodyJson;
    
    try {
        bodyJson = JSON.parse(body);
    } catch(e) {
        callback(null, {
            statusCode: 400,
            body: "Body is not JSON",
            headers: {"Content-Type": "text/plain"}
        });
        //fallback to query params
        if(event.queryStringParameters.to) {
            body = {
                from: event.queryStringParameters.from,
                to: event.queryStringParameters.to
            }
        } else {
            return false;
        }
    }


    var bodyUrl;
    try {
        bodyUrl = new URL(bodyJson.to);
    } catch(e) {
        callback(null, {
            statusCode: 400,
            body: "Body.to is not a valid URL"
        });
        return false;
    }

    var short = bodyJson.from ? bodyJson.from + "" : ((Date.now()).toString(36));
    short = short.replace(/\./g, "-");

    if(short.startsWith("-g")) {
        callback(null, {
            statusCode: 400,
            body: "Shortlink starts with reserved prefix '-g'. Please use another",
            headers: {"Content-Type": "text/plain"}
        });
        return false;
    }

    
    var body = JSON.stringify(
        {"create":"shorten-links","params":{"object":{"data":{"object":{"short":short,"long":bodyUrl.toString()}}}}}
    );


    var https = require("https");

    const options = {
        hostname: "db.fauna.com",
        path: "/",
        method: 'POST',
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.FAUNA_API, 'Content-Length': Buffer.byteLength(body) },
    }

    console.log(options);

    var req = https.request(options, function (res) {
        res.setEncoding("utf8");

        var body = "";

        res.on("data", function (chunk) {
            body += chunk;
        });
        res.on("close", function() {
            var resJson = JSON.parse(body);
            if(resJson.errors) {
                callback(null, {
                    statusCode: 409,
                    body: resJson.errors[0].code,
                    headers: {"Content-Type": "text/plain"}
                });
                return false;
            }
            callback(null, {
                statusCode: 201,
                body: BASE_URL + short,
                headers: {"Content-Type": "text/plain"}
            });
        });
    });

    req.on("error", function(err) {
        console.log(err);
        callback(null, {
            statusCode: 500,
            body: err.message,
            headers: {"Content-Type": "text/plain"}
        });
    });

    req.end(body);
}