const { spawn, call, send, shutdown } = require('./index');

jest.setTimeout(30000);

describe('hoverlord', () => {
  it('can call from the main process', async () => {
    await spawn(() => {
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

  it('can call a process from another process', async () => {
    await spawn(() => {
      const { receive, reply } = require('./index');
      return receive(
        (state, message) => {
          if (
            Object.prototype.hasOwnProperty.call(message.message, 'fakeCount')
          ) {
            reply(message, state);
            return message.message;
          }
          if (message.message === 'inspect') {
            reply(message, state);
          }
          return state;
        },
        [1, 2, 3],
      );
    }, 'statefulActor');

    await spawn(() => {
      const { receive, reply, call } = require('./index');
      return receive((state, message) => {
        switch (message.message) {
          case 'do_the_call': {
            const newState = { fakeCount: 1000 };
            call('statefulActor', newState).then((remoteState) => {
              reply(message, ['done', remoteState]);
            });
            return null;
          }
          default:
            return state;
        }
      });
    }, 'caller');

    const {
      message: [callerResponse, remoteState],
    } = await call('caller', 'do_the_call');

    const { message: result } = await call('statefulActor', 'inspect');

    shutdown();

    expect(callerResponse).toBe('done');
    expect(remoteState.message).toEqual([1, 2, 3]);
    expect(remoteState.fromWorker).toBe(true);
    expect(result).toEqual({ fakeCount: 1000 });
  });
});
