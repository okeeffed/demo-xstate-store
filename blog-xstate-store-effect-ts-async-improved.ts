import { assign, createActor, fromPromise, setup } from "xstate";
import { Effect, Random } from "effect";

export const getGreeting = (name: string) =>
  Effect.gen(function* () {
    // Simulate delay
    yield* Effect.sleep(1000);

    // Simulate potential failure
    const shouldFail = yield* Random.nextBoolean;

    if (shouldFail) {
      yield* Effect.fail(new Error("Random failure occurred"));
    }

    return { greeting: `Hello, ${name}!` };
  });

export const fetchMachine = setup({
  types: {
    context: {} as {
      name: string;
      data: {
        greeting: string;
      } | null;
    },
  },
  actors: {
    fetchUser: fromPromise(({ input }: { input: { name: string } }) =>
      getGreeting(input.name).pipe(Effect.runPromise)
    ),
  },
}).createMachine({
  initial: "idle",
  context: {
    name: "World",
    data: null,
  },
  states: {
    idle: {
      on: {
        FETCH: "loading",
      },
    },
    loading: {
      invoke: {
        src: "fetchUser",
        input: ({ context }) => ({ name: context.name }),
        onDone: {
          target: "success",
          actions: assign({
            data: ({ event }) => event.output,
          }),
        },
        onError: "failure",
      },
    },
    success: {},
    failure: {
      after: {
        1000: "loading",
      },
      on: {
        RETRY: "loading",
      },
    },
  },
});

const fetchActor = createActor(fetchMachine);
fetchActor.subscribe((state) => {
  console.log("Value:", state.value);
  console.log("Context:", state.context);
});
fetchActor.start();

fetchActor.send({ type: "FETCH" });
