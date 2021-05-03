const http = require('http');
const { spawn } = require('child_process');
const { withRetry } = require('./utils');

const VERDACCIO_CONTAINER_NAME = 'verdaccio-hoverlord';
const VERDACCIO_CONTAINER_PORT = 4873;

const isReady = () =>
  new Promise((resolve, reject) => {
    http
      .request(
        `http://localhost:${VERDACCIO_CONTAINER_PORT}`,
        { method: 'HEAD' },
        (res) => {
          console.log('isReady', res.statusCode);
          if (res.statusCode === 200) {
            resolve();
          } else {
            reject(res);
          }
        },
      )
      .on('error', (err) => {
        reject(err);
      })
      .end();
  });

exports.startVerdaccio = async () => {
  const [
    cmd,
    ...args
  ] = `docker run --rm --name ${VERDACCIO_CONTAINER_NAME} -p ${VERDACCIO_CONTAINER_PORT}:4873 verdaccio/verdaccio`.split(
    /\s+/gi,
  );

  spawn(cmd, args);

  return withRetry(2000, 10)(isReady);
};

exports.stopVerdaccio = async () => {
  const [cmd, ...args] = `docker kill ${VERDACCIO_CONTAINER_NAME}`.split(
    /\s+/gi,
  );

  const verdaccio = spawn(cmd, args);

  return new Promise((resolve, reject) => {
    verdaccio.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
};
