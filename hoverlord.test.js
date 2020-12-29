const { spawn, call, send, shutdown } = require('./index');

describe('hoverlord', () => {
  it('inspects the state of a process', async () => {
    const actor = await spawn(() => {
      const { receive, reply } = require('./index');
      return receive((state, message) => {
        switch (message.message) {
          case 'ping':
            return state + 1;
          case 'pang':
            reply(message, state);
            return state;
          default:
            return state;
        }
      }, 0);
    }, 'demoActor');
    send('demoActor', 'ping');
    send('demoActor', 'ping');
    send('demoActor', 'ping');
    send('demoActor', 'ping');

    const { message: result } = await call('demoActor', 'pang');
    shutdown();
    expect(result).toBe(4);
  });
});
