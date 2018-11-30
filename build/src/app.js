module.exports = function(req,res) {
    res.writeHead(200);
    res.end(JSON.stringify(req));
};
