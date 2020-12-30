const { spawn, call, send, shutdown } = require('./index');

const findDuplicates = (arr) =>
  arr.filter((item, index) => arr.indexOf(item) != index);

describe('hoverlord', () => {
  it('can call from the main process', async () => {
    await spawn(() => {
      const { receive, reply } = require('./index');
      return receive((state, message) => {
        switch (message.content) {
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

    const { content: result } = await call('demoActor', 'pang');
    shutdown();
    expect(result).toBe(4);
  });

  it('can call a process from another process', async () => {
    await spawn(() => {
      const { receive, reply } = require('./index');
      return receive(
        (state, message) => {
          if (
            Object.prototype.hasOwnProperty.call(message.content, 'fakeCount')
          ) {
            reply(message, state);
            return message.content;
          }
          if (message.content === 'inspect') {
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
        switch (message.content) {
          case 'do_the_call': {
            const newState = { fakeCount: 1000 };
            call('statefulActor', newState).then(({ content }) => {
              reply(message, ['done', content]);
            });
            return null;
          }
          default:
            return state;
        }
      });
    }, 'caller');

    const {
      content: [callerResponse, remoteState],
    } = await call('caller', 'do_the_call');

    const { content: result, fromWorker } = await call(
      'statefulActor',
      'inspect',
    );

    shutdown();

    expect(callerResponse).toBe('done');
    expect(remoteState).toEqual([1, 2, 3]);
    expect(fromWorker).toBe(true);
    expect(result).toEqual({ fakeCount: 1000 });
  });

  it('should not create duplicate fingerprints', async () => {
    await spawn(() => {
      const { receive, reply } = require('./index');
      return receive((_, message) => {
        if (message.content === 'ping') {
          reply(message, 'pong');
        }
      });
    }, 'receiver');

    let fingerprints = [];

    for (let i = 0; i < 10000; i++) {
      const response = await call('receiver', 'ping');
      fingerprints.push(response.fingerprint);
      expect(response.content).toBe('pong');
    }

    shutdown();

    const duplicates = [...new Set(findDuplicates(fingerprints))];
    expect(duplicates).toHaveLength(0);
  });
});
