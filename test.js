const http = require('http');
const { spawn, send } = require('./index');

spawn(() => {
  const { receive } = require('./index');
  receive((_state, { message }) => {
    console.log(`log: ${message}`);
  });
}, 'logger');

spawn(() => {
  const { receive, send, call } = require('./index');
  return receive((state, { message }) => {
    switch (message) {
      case 'ping':
        const newState = state + 1;
        call('replier', 'this needs a reply').then((x) =>
          console.log('response:', x),
        );
        send('logger', newState);
        return newState;
      default:
        return state;
    }
  }, 0);
}, 'stateReducer');

spawn(() => {
  const { receive, reply } = require('./index');
  return receive((state, payload) => {
    if (payload.message === 'this needs a reply') {
      reply(payload, 'THIS IS A REPLY');
    }
  });
}, 'replier');

http
  .createServer((req, res) => {
    send('stateReducer', 'ping');
    res.writeHead(200);
    res.end(`Current process\n ${process.pid}`);
  })
  .listen(4000);
