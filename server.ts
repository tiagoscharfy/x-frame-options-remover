import express from "express";
import morgan from "morgan";
import axios from "axios";
import mime from "mime";
import { setupCache } from "axios-cache-adapter";

const cache = setupCache({
    maxAge: 15 * 60 * 1000
});

const axiosReq = axios.create({
    adapter: cache.adapter
});

const app = express();
app.use(morgan('tiny'));

const regex = /\s+(href|src)=['"](.*?)['"]/g;

function getMimeType( url: string ) {
    if( url.indexOf("?") !== -1 ) {
        url = url.split("?")[0];
    }

    if( mime.getType(url) === 'application/x-msdownload' ) return 'text/html';
    return mime.getType(url) || 'text/html';
};

app.get("/", (request, response) => {
    const { url } = request.query;

    if(!url) {
        response.type('text/html');
        return response.end("You need to specify <code>url</code> query parameter");
    }

    axiosReq.get(url.toString())
        .then((data) => {
            let html_code = data["data"];
            const url_mime = getMimeType(url.toString());
            if( url_mime === 'text/html' ) {
                html_code = html_code.toString().replace(regex, (match, p1, p2) => {
                    
                    let newUrl = '';

                    if( p2.indexOf('data:image') !== -1 ) {
                        return match;
                    }
                    
                    if( getMimeType(p2) !== 'text/html' ) {
                        return match;
                        console.log("MATCH: " + match);
                    }

                    if(p2.indexOf('http') !== -1) {
                        newUrl = p2;
                    } else if (p2.substr(0,2) === '//') {
                        newUrl = 'http:' + p2;
                    } else {
                        const searchURL = new URL(url.toString());
                        newUrl = searchURL.protocol + '//' + searchURL.host + "/" + p2;
                    }
                    return ` ${p1}="${request.protocol}://${request.hostname}:3000/?url=${newUrl}"`;                   

                });
            }
            response.type(url_mime);
            response.send(html_code);
        }).catch(error => {
            console.log("ERRO AQUI! => " + error);
            response.end("OK");
        });

});

app.listen(3000, () => {
    console.log("🚀 Server started on http://localhost:3000");
});