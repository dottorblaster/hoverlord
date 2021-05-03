const { spawn } = require('child_process');
const setup = require('./setup');
const teardown = require('./teardown');

const terminate = async () => {
  console.log(`Shutting down graceflly`);
  try {
    await teardown();
    console.log(`Done. Bye!`);
  } catch (error) {
    console.error(`Error during shut down:`, error);
  }
};

process.on('SIGTERM', terminate);
process.on('SIGINT', terminate);

const [, , testFolder] = process.argv;
setup(testFolder)
  // login to local registry
  .then(async () => {
    // TODO: must login to local registry
  })
  // publish current package
  .then(async () => {
    console.log(`Publishing Hoverlord to local registry...`);
    const [cmd, ...args] = `npm publish --registry http://localhost:4873`.split(
      /\s+/gi,
    );
    const publishProcess = spawn(cmd, args);
    publishProcess.stdout.pipe(process.stdout);
    publishProcess.stderr.pipe(process.stderr);
    await new Promise((resolve) => {
      publishProcess.on('close', (code) => resolve(code));
    });
    console.log(`Hoverlord published to local registry.`);
  })
  // install package into test project
  .then(async () => {
    console.log(`Installing test dependencies...`);
    const cwd = `${__dirname}/${testFolder}`;
    console.log('...', cwd);
    const [cmd, ...args] = `npm install`.split(/\s+/gi);
    const installProcess = spawn(cmd, args, {
      cwd,
    });
    installProcess.stdout.pipe(process.stdout);
    installProcess.stderr.pipe(process.stderr);
    await new Promise((resolve) => {
      installProcess.on('close', (code) => resolve(code));
    });
    console.log(`Test dependencies installed.`);
  })
  // execute tests
  .then(async () => {
    console.log(`Executing test...`);
    const cwd = `${__dirname}/${testFolder}`;
    console.log('...', cwd);
    const [cmd, ...args] = `npm test`.split(/\s+/gi);
    const testProcess = spawn(cmd, args, {
      cwd,
    });
    testProcess.stdout.pipe(process.stdout);
    testProcess.stderr.pipe(process.stderr);
    await new Promise((resolve) => {
      testProcess.on('close', (code) => resolve(code));
    });
    console.log(`Test executed.`);
  })
  .catch((e) => console.error('Oops!', e));
