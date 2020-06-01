"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var morgan_1 = __importDefault(require("morgan"));
var axios_1 = __importDefault(require("axios"));
var mime_1 = __importDefault(require("mime"));
var axios_cache_adapter_1 = require("axios-cache-adapter");
var cheerio_1 = __importDefault(require("cheerio"));
var cache = axios_cache_adapter_1.setupCache({
    maxAge: 15 * 60 * 1000
});
var axiosReq = axios_1.default.create({
    adapter: cache.adapter
});
var script_injection = 'teste';
var app = express_1.default();
app.use(morgan_1.default('tiny'));
var regex = /\s+(href|src)=['"](.*?)['"]/g;
function getMimeType(url) {
    if (url.indexOf("?") !== -1) {
        url = url.split("?")[0];
    }
    if (mime_1.default.getType(url) === 'application/x-msdownload')
        return 'text/html';
    return mime_1.default.getType(url) || 'text/html';
}
;
app.get("/", function (request, response) {
    var url = request.query.url;
    console.log("URL: " + url);
    if (!url) {
        response.type('text/html');
        return response.end("You need to specify <code>url</code> query parameter");
    }
    axiosReq.get(url.toString())
        .then(function (data) {
        var html_code = data["data"];
        var url_mime = getMimeType(url.toString());
        if (url_mime === 'text/html') {
            html_code = html_code.toString().replace(regex, function (match, p1, p2) {
                var newUrl = '';
                if (p2.indexOf('data:image') !== -1) {
                    return match;
                }
                if (getMimeType(p2) !== 'text/html') {
                    return match;
                    console.log("MATCH: " + match);
                }
                if (p2.indexOf('http') !== -1) {
                    newUrl = p2;
                }
                else if (p2.substr(0, 2) === '//') {
                    newUrl = 'http:' + p2;
                }
                else {
                    var searchURL = new URL(url.toString());
                    newUrl = searchURL.protocol + '//' + searchURL.host + "/" + p2;
                }
                return " " + p1 + "=\"" + request.protocol + "://" + request.hostname + ":3000/?url=" + newUrl + "\"";
            });
            var $ = cheerio_1.default.load(html_code);
            $('head').append(script_injection);
            html_code = $.html();
        }
        response.type(url_mime);
        response.send(html_code);
    }).catch(function (error) {
        console.log("ERRO AQUI! => " + error);
        response.end("OK");
    });
});
app.listen(3000, function () {
    console.log("🚀 Server started on http://localhost:3000");
});
