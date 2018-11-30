const   {URL} = require("url");

class CookieJar {
    constructor() {
        this._cookies = [];
    }

    cookies(domain,parsed) {
        let response = {},
            cookies;
        parsed = typeof(parsed) === "boolean" ? parsed : true;
        cookies = (domain ? this._cookies.filter(cookie=>cookie.domain === domain) : this._cookies);
        cookies.forEach(cookie=>response[cookie.key] = cookie.value);
        return cookies[0] ? (parsed ? response : Object.entries(response).map(e=>e[1] ? e.join("=") : e[0]).join("; ")) : undefined;
    }

    cookie(domain,key,parsed) {
        parsed = parsed && typeof(parsed) === "boolean" ? parsed : true;
        if (!domain||!key) throw new Error("Argument(s) manquant(s)");
        let cookie = this._cookies.find(cookie=>cookie.domain === domain && cookie.key === key);
        return cookie ? (parsed ? {[cookie.key]:(cookie.value)} : (cookie.value ? `${cookie.key}=${cookie.value}` : cookie.key)) : undefined;
    }

    parse(string) {
        let response = {},
            tmp = string.split(";").map(e=>e.trim().split("="));
        tmp.forEach(entry=>response[entry[0]] = entry[1]);
        return response;
    }

    add_cookies(cookies,url) {
        let self = this;
        if (!url||!cookies) throw new Error("Argument(s) manquant(s)");
        url = new URL(url);
        if (typeof(cookies) === "string") cookies = self.parse(cookies);
        for (let cookie of Object.entries(cookies)) {
            try {
                if (self.cookie(url.host,cookie[0])) throw new Error("Le cookie existe déjà");
                else self._cookies.push({
                    key:cookie[0],
                    value:cookie[1],
                    domain:url.host
                });
            }catch(err) {console.log(err);}
        }
    }

    delete_cookie(domain,key) {
        let cookieIndex = this._cookies.findIndex(cookie=>cookie.domain === domain && cookie.key === key);
        if (!cookieIndex) throw new Error(`Aucun cookie exitant pour le domaine "${domain}" et la clé "${key}"`);
        delete this._cookies[cookieIndex];
    }

    update_cookie(domain,key,newValue) {
        let cookieIndex = this._cookies.findIndex(cookie=>cookie.domain === domain && cookie.key === key);
        if (!cookieIndex) throw new Error(`Aucun cookie exitant pour le domaine "${domain}" et la clé "${key}"`);
        this._cookies[cookieIndex] = newValue;
    }
}

module.exports = CookieJar;
