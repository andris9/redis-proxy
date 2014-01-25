"use strict";

/*
Extremely simple http proxy that uses Redis as routing table

> redis-cli
SELECT 5
HSET proxy~router "domain" "localhost:port"

Unicode domains must be stored in the unicode form, not in punycode form
*/

var config = require("./config/" + (process.env.NODE_ENV || "development") + ".js"),
    http = require("http"),
    httpProxy = require('http-proxy'),
    redis = require("redis"),
    redisClient = redis.createClient(config.redis.port, config.redis.host),
    proxy = httpProxy.createServer(),
    punycode = require("punycode");

proxy.on('error', function (err, req, res) {
    res.writeHead(500, {
        "Content-Type": "text/plain"
    });

    res.end("Something went wrong");

    console.log("Proxy error");
    console.log(err);
});

http.createServer(function (req, res) {
    var host = (req.headers.host || "").
            // remove port 80 and 443 if specified
            replace(/:(80|443)$/, "").
            trim().toLowerCase().
            // Convert punycode domains to unicode
            replace(/^[^:]+/, punycode.toUnicode);

    redisClient.multi().
        select(config.redis.db).
        hget("proxy~router", host).
        exec(function(err, replies){
            if(err){
                res.writeHead(500, {
                    "Content-Type": "text/plain"
                });
                res.end("Something went wrong");

                console.log("Redis error");
                console.log(err);
                return;
            }
            if(!replies || !replies[1]){
                res.writeHead(404, {
                    "Content-Type": "text/plain"
                });
                res.end("Unknown hostname");
                return;
            }

            var target = {
                target: (!replies[1].match(/^https?:\/\//i) ? "http://" : "") + replies[1]
            };

            proxy.web(req, res, target);
        });

}).listen(config.port, function(){
    if(config.gid){
        try{
            process.setgid(config.gid);
            console.log("Changed GID to %s", config.gid);
        }catch(E){
            console.log("Error: Failed changing GID to %s", config.gid);
            console.log(E);
        }
    }
    if(config.uid){
        try{
            process.setuid(config.uid);
            console.log("Changed UID to %s", config.uid);
        }catch(E){
            console.log("Error: Failed changing UID to %s", config.uid);
            console.log(E);
        }
    }
    console.log("HTTP proxy listening on port %s", config.port);
});
