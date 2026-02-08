const { execFileSync } = require('node:child_process');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = path.join(context.appOutDir, `${appName}.app`);

  try {
    execFileSync('xattr', ['-cr', appPath], { stdio: 'inherit' });
  } catch (error) {
    // Surface a clear error so packaging doesn't fail later in codesign.
    throw new Error(`Failed to clear xattrs for ${appPath}: ${error.message}`);
  }
};
