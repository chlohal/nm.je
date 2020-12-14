exports.handler = function (event, context, callback) {
    var pathParts = event.path.split("/");
    var shortened = pathParts[pathParts.length - 1];

    console.log(event.queryStringParameters);
    if(!shortened) {
        callback(null, {
            statusCode: 400,
            body: "No shortening code with ?id="
        });
        return false;
    }

    shortened = shortened + "";

    console.log("shortenerd", shortened);

    if(shortened.indexOf(".") > 0) {
        callback(null, {
            statusCode: 404,
            body: "Cannot contain dots.",
            headers: {"Content-Type": "text/plain"}
        });
        return false;
    }

    //make FQL json to find our shortener term
    var body = JSON.stringify(
        {"select":["data","long"],"from":{"get":{"match":{"index":"shorteners"},"terms":shortened.toLowerCase()}},"default":""}
    );

    var https = require("https");

    const options = {
        hostname: "db.fauna.com",
        path: "/",
        method: 'POST',
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.FAUNA_API, 'Content-Length': Buffer.byteLength(body) },
    }

    var req = https.request(options, function (res) {
        res.setEncoding("utf8");

        var body = "";

        res.on("data", function (chunk) {
            body += chunk;
        });
        res.on("close", function() {
            var jsonBody = JSON.parse(body);
            if(jsonBody.errors) {
                callback(null, {
                    statusCode: 302,
                    headers: {
                        "Location": "/404?from=" + encodeURIComponent(shortened)
                    }
                });
                return false; 
            }
            else {
                callback(null, {
                    statusCode: 301,
                    headers: {
                        "Location": jsonBody.resource
                    }
                });
            }
            
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