const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`Node 22.13 or newer is required; found ${process.versions.node}. Use your Node version manager (the repository includes .nvmrc).`);
  process.exit(1);
}
