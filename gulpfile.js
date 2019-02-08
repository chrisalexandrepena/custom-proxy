require("dotenv").config();
const   gulp        = require("gulp"),
        {execSync}  = require("child_process"),
        {spawnSync} = require("child_process"),
        pathParser  = require("path"),
        fs          = require("fs"),
        del         = require("del"),
        paths       = {
            base: ""
        };

let dependencies = [];

(function getPaths(){
    let websiteDir = /(^.+\/Websites)\//gi.exec(__dirname);
    paths.base = websiteDir ? websiteDir[1] : undefined;
    if (!paths.base) throw new Error("Aucun dossier Websites détecté");
    for (let dep of dependencies) {
        paths[dep] = execSync(
            `find ${paths.base} -type d -name ${dep}`,
            {encoding:"utf8"}
        ).split("\n").find(path=>!/\/src\//gi.test(path)&&!/\/vendor\//gi.test(path));
        if (!paths[dep]) throw new Error(`Aucun dossier trouvé pour la dépendance "${dep}"`);
    }
})();

function movevendor(cb) {
    for (let dep of dependencies) {
        if (fs.existsSync(pathParser.join(__dirname,`app/vendor/${dep}`))) del.sync(pathParser.join(__dirname,`app/vendor/${dep}`));
        if (fs.existsSync(pathParser.join(paths[dep],"build")) && dep !== "APICallers") {
            gulp
                .src(pathParser.join(paths[dep],"build/**/*"))
                .pipe(
                    gulp.dest(
                        pathParser.join(__dirname,`app/vendor/${dep}`)
                    )
                );
        }else if (fs.existsSync(pathParser.join(paths[dep],"src"))) {
            gulp
                .src(pathParser.join(paths[dep],"src/**/*"))
                .pipe(
                    gulp.dest(
                        pathParser.join(__dirname,`app/vendor/${dep}`)
                    )
                );
        }
    }
    cb();
}

function checkstructure(cb) {
    if (!fs.existsSync(pathParser.join(__dirname,"app"))) fs.mkdirSync(pathParser.join(__dirname,"app"));
    if (!fs.existsSync(pathParser.join(__dirname,"app/.cookies"))) fs.mkdirSync(pathParser.join(__dirname,"app/.cookies"));
    if (!fs.existsSync(pathParser.join(__dirname,"app/.ssl"))) fs.mkdirSync(pathParser.join(__dirname,"app/.ssl"));
    if (!fs.existsSync(pathParser.join(__dirname,"app/.ssl/ssl.key"))) {
        spawnSync(
            "openssl",
            [
                "genrsa",
                "-out",
                pathParser.join(__dirname,"app/.ssl/ssl.key"),
                "2048"
            ]
        );
    }
    if (!fs.existsSync(pathParser.join(__dirname,"app/.ssl/ssl.crt"))) spawnSync(
        "openssl",
        [
            "req",
            "-new",
            "-x509",
            "-key",
            pathParser.join(__dirname,"app/.ssl/ssl.key"),
            "-out",
            pathParser.join(__dirname,"app/.ssl/ssl.crt"),
            "-days",
            "9999",
            "-subj",
            "/CN=localhost"
        ]
    );
    cb();
}

gulp.task("sync",cb=>{
    for (let e of ["app/",".env","package*"]) {
        execSync(`rsync ${/\*/gi.test(e)||fs.statSync(e).isFile() ? "-vu" : "-rvu"} ${pathParser.join(__dirname,e)} ${process.env.remote_user}@${process.env.remote_server}:${process.env.remote_projectpath} --exclude "node_modules" --exclude ".cookies/*" --exclude "*.dist"${/\*/gi.test(e)||fs.statSync(e).isFile() ? "" : " --delete"}`);
    }
    execSync(`ssh ${process.env.remote_user}@${process.env.remote_server} 'cd ${process.env.remote_projectpath} && npm i'`);
    cb();
});

gulp.task("watch",cb=>{
    for (let dep of dependencies) {
        if (fs.existsSync(pathParser.join(paths[dep],"build"))) {
            gulp.watch(
                pathParser.join(paths[dep],"build/**/*"),
                gulp.series(checkstructure,movevendor)
            );
        }else if (fs.existsSync(pathParser.join(paths[dep],"src"))) {
            gulp.watch(
                pathParser.join(paths[dep],"src/**/*"),
                gulp.series(checkstructure,movevendor)
            );
        }
    }
    cb();
});

exports.default = gulp.series(checkstructure,movevendor);
