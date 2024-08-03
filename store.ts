import { createStoreWithProducer } from "@xstate/store";
import { produce } from "immer";

interface ExampleStoreState {
  count: number;
  todos: string[];
}

const exampleStore = createStoreWithProducer(
  // Producer
  produce,
  // Initial context
  { count: 0, todos: [] } as ExampleStoreState,
  // Transitions
  {
    inc: (context, event: { by: number }) => {
      // No return; handled by Immer
      context.count += event.by;
    },
    addTodo: (context, event: { todo: string }) => {
      // No return; handled by Immer
      context.todos.push(event.todo);
    },
  }
);

// Get the current state (snapshot)
console.log(exampleStore.getSnapshot());
// => {
//   status: 'active',
//   context: { count: 0, todos: []}
//   output: undefined,
//   error: undefined,
// }

// Subscribe to snapshot changes
exampleStore.subscribe((snapshot) => {
  console.log(snapshot.context);
});

// Send an event
exampleStore.send({ type: "inc", by: 2 });
// logs { count: 2, todos: [] }

exampleStore.send({ type: "addTodo", todo: "Buy milk" });
// logs { count: 2, todos: ['Buy milk'] }

console.log(exampleStore.getSnapshot());
// {
//   context: {
//     count: 2,
//     todos: [ "Buy milk" ],
//   },
//   status: "active",
//   output: undefined,
//   error: undefined,
// }
