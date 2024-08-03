import { setup, assign, createActor } from "xstate";
import { createBrowserInspector } from "@statelyai/inspect";

const inspector = createBrowserInspector();

interface ExampleStoreState {
  count: number;
  todos: string[];
}

type Events = { type: "inc"; by: number } | { type: "addTodo"; todo: string };

// 1. Use `createMachine(…)` instead of `createStore(…)`
const machine = setup({
  types: {
    context: {} as ExampleStoreState,
    events: {} as Events,
  },
}).createMachine({
  // 2. Move the first argument (the initial `context` object)
  // to the `context` property of the machine configuration
  context: {
    count: 0,
    todos: [],
  },
  // 3. Move the second argument (the `transitions` object)
  // to the `on` property of the machine configuration
  on: {
    inc: {
      // 4. Wrap the assignments in `assign(…)`
      actions: assign({
        // 5. Destructure `context` and `event` from the first argument
        count: ({ context, event }) => context.count + event.by,
      }),
    },
    addTodo: {
      actions: assign({
        todos: ({ context, event }) => {
          context.todos.push(event.todo);
          return context.todos;
        },
      }),
    },
  },
});

// Create an actor that you can send events to.
// Note: the actor is not started yet!
const actor = createActor(machine, {
  inspect: inspector.inspect,
});

actor.start();

console.log(actor.getSnapshot());

// Subscribe to snapshot changes
actor.subscribe((snapshot) => {
  console.log(snapshot.context);
});

// Send an event
actor.send({ type: "inc", by: 2 });
// logs { count: 2, todos: [] }

actor.send({ type: "addTodo", todo: "Buy milk" });
// logs { count: 2, todos: ['Buy milk'] }
