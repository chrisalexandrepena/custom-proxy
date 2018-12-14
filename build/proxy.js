require("dotenv").config();
const	express			= 	require("express"),
		pathParser		= 	require("path"),
		url				= 	require("url"),
		fs				= 	require("fs"),
		app				= 	new express(),
		sslCredentials	= 	{
								key:	fs.readFileSync(pathParser.join(__dirname,".ssl/ssl.key"),"utf8"),
								cert:	fs.readFileSync(pathParser.join(__dirname,".ssl/ssl.crt"),"utf8")
							},
		httpServer		= 	require("http").createServer(app),
		httpsServer		= 	require("https").createServer(sslCredentials,app),
		proxyServer		= 	require("http-proxy").createProxyServer(),
		ToughCookie		= 	require("tough-cookie"),
		cookieJar		=	fs.existsSync(pathParser.join(__dirname,".cookies/cookies.json")) ?
								ToughCookie.CookieJar.fromJSON(
									JSON.parse(
										fs.readFileSync(
											pathParser.join(__dirname,".cookies/cookies.json"),
											{encoding:"utf8"}
										)
									)
								) :
								new ToughCookie.CookieJar(undefined,{looseMode:true}),
		sslDomains	=	fs.existsSync(".ssl/sslDomains.json") ?
						JSON.parse(fs.readFileSync(
							pathParser.join(__dirname,".ssl/sslDomains.json"),
							{encoding:"utf8"}
						)) :
						{https:[],http:[]};

proxyServer.on('proxyReq', (proxyReq, req) => {
	proxyReq.setHeader('user-agent', process.env.USER_AGENT);
	proxyReq.removeHeader('cookie');
	for (let header of ["origin","referer"]) {
		if (req.headers.hasOwnProperty(header)) {
			if (req.protocol === "http") proxyReq.setHeader(header, req.headers[header].replace(/^https/gi,"http"));
			else if (req.protocol === "https") proxyReq.setHeader(header, req.headers[header].replace(/^http:/gi,"https:"));
		}
	}
	cookieJar.getCookies(
		url.format({protocol:req.protocol,host:req.hostname,pathname:req.path}),
		(err,cookies)=>{
			if (err) console.log(err);
			else if (cookies) proxyReq.setHeader(
				"cookie",
				cookies.map(cookie=>cookie.cookieString()).join("; ")
			);
		}
	);
});

proxyServer.on('proxyRes', (proxyRes, req, res) => {
	if (proxyRes.headers["set-cookie"]) {
		for (let cookie of proxyRes.headers["set-cookie"]) {
			cookieJar.setCookie(
				ToughCookie.Cookie.parse(cookie,{loose:true}),
				url.format({protocol:req.protocol,host:req.hostname,pathname:req.path}),
                {loose:true},
				(err,cookie)=>{
					if (err && /^Cookie not in this host's domain/gi.test(err.message) && cookie) {
						console.log(err.message);
						cookieJar.setCookie(
							ToughCookie.Cookie.parse(cookie,{loose:true}),
							undefined,
							{loose:true},
							(err,cookie)=>{if (err) console.log(err);}
						);
					}
				}
			);
		}
		fs.writeFileSync(
			pathParser.join(__dirname,".cookies/cookies.json"),
			JSON.stringify(cookieJar.toJSON()),
			{encoding:"utf8"}
		);
		res.removeHeader('set-cookie');
	}
});


app.all("*",(req,res)=>{
	let protocol =	sslDomains.http.includes(req.hostname) ? "http" :
					(
						sslDomains.https.includes(req.hostname) ? "https" :
						req.protocol
					)
	console.log(
		`Request for ${url.format({
			protocol:	protocol,
			host:		req.hostname,
			pathname:	req.originalUrl
		})}`
	);

	proxyServer.web(
		req,res,
		{
			target: url.format({
				protocol:	protocol,
				host:		req.hostname
			}),
			changeOrigin: true,
			xfwd: false
		},
		err=>{
			if (req.protocol === "http") {
				console.log("Retrying request with https protocol");
				proxyServer.web(
					req,res,
					{
						target: url.format({
							protocol:	"https",
							host:		req.hostname
						}),
						changeOrigin: true,
						xfwd: false
					}
				);
			}else if (req.protocol === "https") {
				console.log("Retrying request with http protocol");
				proxyServer.web(
					req,res,
					{
						target: url.format({
							protocol:	"http",
							host:		req.hostname
						}),
						changeOrigin: true,
						xfwd: false
					}
				);
			}else console.log(err);
		}
	);
});

httpServer.listen(parseInt(process.env.HTTP_SERVER_PORT));
httpsServer.listen(parseInt(process.env.HTTPS_SERVER_PORT));
