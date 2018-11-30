const   gulp = require("gulp"),
        CP = require("child_process"),
        pathParser = require("path"),
        fs = require("fs"),
        del = require("del"),
        paths = {
            base: ""
        };

let dependencies = [];

(function getPaths(){
    let websiteDir = /(^.+\/Websites)\//gi.exec(__dirname);
    paths.base = websiteDir ? websiteDir[1] : undefined;
    if (!paths.base) throw new Error("Aucun dossier Websites détecté");
    for (let dep of dependencies) {
        paths[dep] = CP.execSync(
            `find ${paths.base} -type d -name ${dep}`,
            {encoding:"utf8"}
        ).split("\n").find(path=>!/\/src\//gi.test(path)&&!/\/vendor\//gi.test(path));
        if (!paths[dep]) throw new Error(`Aucun dossier trouvé pour la dépendance "${dep}"`);
    }
})();

gulp.task("deletedeps", function() {
    for (let dep of dependencies) {
        if (fs.existsSync(pathParser.join(__dirname,`build/vendor/${dep}`))) del.sync(pathParser.join(__dirname,`build/vendor/${dep}`));
    }
});

gulp.task("movevendor", function() {
    for (let dep of dependencies) {
        if (fs.existsSync(pathParser.join(paths[dep],"build"))) {
            gulp
                .src(pathParser.join(paths[dep],"build/**/*"))
                .pipe(
                    gulp.dest(
                        pathParser.join(__dirname,`build/vendor/${dep}`)
                    )
                );
        }else if (fs.existsSync(pathParser.join(paths[dep],"src"))) {
            gulp
                .src(pathParser.join(paths[dep],"src/**/*"))
                .pipe(
                    gulp.dest(
                        pathParser.join(__dirname,`build/vendor/${dep}`)
                    )
                );
        }
    }
});

gulp.task("checkstructure", function() {
    if (!fs.existsSync(pathParser.join(__dirname,"build"))) fs.mkdirSync(pathParser.join(__dirname,"build"));
    if (!fs.existsSync(pathParser.join(__dirname,"build/.cookies"))) fs.mkdirSync(pathParser.join(__dirname,"build/.cookies"));
    if (!fs.existsSync(pathParser.join(__dirname,"build/.ssl"))) fs.mkdirSync(pathParser.join(__dirname,"build/.ssl"));
    if (!fs.existsSync(pathParser.join(__dirname,"build/.ssl/ssl.key"))) {
        CP.spawnSync(
            "openssl",
            [
                "genrsa",
                "-out",
                pathParser.join(__dirname,"build/.ssl/ssl.key"),
                "2048"
            ]
        );
    }
    if (!fs.existsSync(pathParser.join(__dirname,"build/.ssl/ssl.crt"))) CP.spawnSync(
        "openssl",
        [
            "req",
            "-new",
            "-x509",
            "-key",
            pathParser.join(__dirname,"build/.ssl/ssl.key"),
            "-out",
            pathParser.join(__dirname,"build/.ssl/ssl.crt"),
            "-days",
            "9999",
            "-subj",
            "/CN=localhost"
        ]
    );
});

gulp.task("default",["checkstructure","deletedeps","movevendor"], function(){});

gulp.task("watch",function(){
    for (let dep of dependencies) {
        if (fs.existsSync(pathParser.join(paths[dep],"build"))) {
            console.log(`watching build ${pathParser.join(paths[dep],"build/**/*")}`);
            gulp.watch(pathParser.join(paths[dep],"build/**/*"),["default"]);
        }else if (fs.existsSync(pathParser.join(paths[dep],"src"))) {
            console.log(`watching src ${pathParser.join(paths[dep],"src/**/*")}`);
            gulp.watch(pathParser.join(paths[dep],"src/**/*"),["default"]);
        }
    }
});
