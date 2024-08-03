import { setup, createActor, createMachine, assign } from "xstate";
import { Effect, pipe, Data } from "effect";

// Define the events
type CounterEvent =
  | { type: "INCREMENT" }
  | { type: "DECREMENT" }
  | { type: "RESET" };

// Define the context
interface CounterContext {
  count: number;
}

const increment = ({ context }: { context: CounterContext }) =>
  Effect.gen(function* () {
    return context.count + 1;
  });

// Create the machine
const counterMachine = setup({
  types: {} as {
    context: CounterContext;
    events: CounterEvent;
  },
  actions: {
    increment: assign({
      count: ({ context }) => increment({ context }).pipe(Effect.runSync),
    }),
    decrement: ({ context }) =>
      pipe(
        Effect.gen(function* () {
          return context.count - 1;
        }),
        Effect.runSync
      ),
    reset: () => Effect.succeed({ count: 0 }),
  },
}).createMachine({
  context: {
    count: 0,
  },
  initial: "active",
  states: {
    active: {
      on: {
        INCREMENT: {
          actions: ["increment"],
        },
        DECREMENT: {
          actions: ["decrement"],
        },
        RESET: {
          actions: ["reset"],
        },
      },
    },
  },
});

const actor = createActor(counterMachine);

actor.start();

actor.subscribe((snapshot) => {
  console.log(snapshot.context);
});

actor.send({ type: "INCREMENT" });
// actor.send({ type: "DECREMENT" });
// actor.send({ type: "RESET" });
