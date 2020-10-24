# Hoverlord
Actor model library and concurrency primitives for NodeJS.

## Usage
Here's a code snippet, make good use of it.

```js
const http = require('http');
const { spawn, send } = require('hoverlord');

spawn(() => {
  const { receive } = require('hoverlord');
  receive((_state, message) => {
    console.log(`log: ${message}`);
  });
}, 'logger');

spawn(() => {
  const { receive, send } = require('hoverlord');
  return receive((state, { message }) => {
    switch (message) {
      case 'ping':
        const newState = state + 1;
        send('logger', newState);
        return newState;
      default:
        return state;
    }
  }, 0);
}, 'stateReducer');

http
  .createServer((req, res) => {
    send('stateReducer', { message: 'ping' });
    res.writeHead(200);
    res.end(`Current process\n ${process.pid}`);
  })
  .listen(4000);
```

## But wait: what the heck is the actor model anyway?
Wikipedia summarizes it this way:

> The actor model in computer science is a mathematical model of concurrent computation that treats actor as the universal primitive of concurrent computation. In response to a message it receives, an actor can: make local decisions, create more actors, send more messages, and determine how to respond to the next message received. Actors may modify their own private state, but can only affect each other indirectly through messaging (removing the need for lock-based synchronization).

To make it a bit simpler: you've got your "actors", independent software entities that only can communicate through messages, and are declared in the form of pure functions.
