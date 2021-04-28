const { spawn, call, send, shutdown } = require('./../index');

const findDuplicates = (arr) =>
  arr.filter((item, index) => arr.indexOf(item) != index);

describe('hoverlord', () => {
  it('can call from the main process', async () => {
    await spawn(({ receive, reply }) => {
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
    await spawn(({ receive, reply }) => {
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

    await spawn(({ receive, reply, call }) => {
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
    await spawn(({ receive, reply }) => {
      return receive((_, message) => {
        const [term, count] = message.content;
        if (term === 'ping') {
          reply(message, ['pong', count]);
        }
      });
    }, 'receiver');

    let fingerprints = [];

    for (let i = 0; i < 10000; i++) {
      const response = await call('receiver', ['ping', i]);
      fingerprints.push(response.fingerprint);
      expect(response.content).toEqual(['pong', i]);
    }

    shutdown();

    const duplicates = [...new Set(findDuplicates(fingerprints))];
    expect(duplicates).toHaveLength(0);
  });

  it('should be able to include files', async () => {
    await spawn(({ receive, reply }) => {
      return receive((_, message) => {
        const answer = require('./test/includes/export-42');
        const [term] = message.content;
        if (term === 'ping') {
          reply(message, ['pong', answer]);
        }
      });
    }, 'receiver');

    const response = await call('receiver', ['ping']);

    shutdown();

    expect(response.content).toEqual(['pong', 42]);
  });

});
