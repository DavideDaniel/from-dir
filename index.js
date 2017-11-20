const fs = require('fs');
const path = require('path');
const arp = require('app-root-path');
const globby = require('globby');

function isNodePkg(dirpath) {
  return fs.existsSync(path.resolve(dirpath, 'package.json'));
}

function isLernaRepo(dirpath) {
  return isNodePkg(dirpath) && fs.existsSync(path.resolve(dirpath, 'lerna.json'));
}

/**
 * isDir checks if the given path is a directory
 * @param  {String}  dirPath    A path to a directory
 * @return {Boolean}
 */
function isDir(dirPath) {
  try {
    const stats = fs.statSync(dirPath);
    return stats.isDirectory();
  } catch (e) {
    return null;
  }
}

/**
 * A thin wrapper for fs.readdirSync with optional exclusions
 * @param  {String} dir   A directory
 * @param  {Array} exc    An array of exclusions
 * @return {Array}        An array of content from given directory
 */
function readDir(dir, exclusions) {
  const exclude = exclusions || [/node_modules/, /.git/];
  const contents = fs.readdirSync(dir)
      .map(d => path.join(dir, d));

  if (!exclude) return contents;

  return contents.filter((c) => {
    const results = exclude.map(regex => regex.test(c));
    return !results.some(Boolean);
  });
}

/**
 * getAllDirPaths
 * @param  {String} dir     A path to a directory
 * @param  {Array} exclude  An array of regexes to test against
 * @return {Function}       A function that takes an arr to push results to
 */
function getAllDirPaths(dir, exclusions = [/node_modules/]) {
  const exclude = exclusions || [/node_modules/, /.git/];
  return (arr) => {
    const dirs = fs.readdirSync(dir)
       .filter((d) => {
         const filePath = path.join(dir, d);

         const isADir = fs.statSync(filePath).isDirectory();
         const results = exclude.map(regex => regex.test(d));

         return isADir && !results.some(Boolean);
       });
    dirs.forEach((d) => {
      const results = exclude.map(regex => regex.test(d));
      const filePath = path.join(dir, d);
      if (!results.some(Boolean)) {
         // console.log('WITH results', results);
         // console.log('EVALING filePath', filePath);
        arr.push(filePath);
        getAllDirPaths(filePath, exclude)(arr);
      }
    });
    return arr;
  };
}

/**
 * checkDirsForPkg
 * @param  {String} dir     A directory
 * @param  {Array} exclude  An array of regexes to test against
 * @return {Array}          An array of all dirs with package.json
 */
function getNodePkgPaths(dir, exclusions) {
  const exclude = exclusions || [/node_modules/, /.git/];
  return getAllDirPaths(dir, exclude)([]).filter(isNodePkg);
}

function getPkgJson(dirpath) {
  return require(path.resolve(dirpath, 'package.json'));
}

function addPkgRoot(dirpath) {
  return pathTo => path.join(dirpath, pathTo);
}

function getAppRoot(alt) {
  return alt || arp.path;
}

function getLernaPkg(dirpath) {
  return require(path.resolve(dirpath, 'lerna.json'));
}

function getLernaPkgPaths(dirpath) {
  const lernaPkg = getLernaPkg(dirpath);
  if (lernaPkg.useWorkspaces) {
    const pkgJson = getPkgJson(dirpath);

    return globby.sync(pkgJson.workspaces)
    .filter(dir => isDir(dir) && isNodePkg(dir));
  }
  return globby.sync(lernaPkg.packages)
    .filter(isNodePkg)
    .map(addPkgRoot(dirpath));
}

function getMonorepoPaths(dir, exclusions) {
  const exclude = exclusions || [/node_modules/, /.git/];
  const dirpath = dir || getAppRoot();
  if (isLernaRepo(dirpath)) {
    return getLernaPkgPaths(dirpath);
  }
  return getNodePkgPaths(dirpath, exclude);
}
const mod = {
  selfPath() {
    return path.resolve(__dirname);
  },
  readDir,
  isDir,
  isNodePkg,
  isLernaRepo,
  addPkgRoot,
  getAppRoot,
  getPkgJson,
  getLernaPkg,
  getAllDirPaths,
  getNodePkgPaths,
  getMonorepoPaths,
};

module.exports = mod;
