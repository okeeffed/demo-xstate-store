import { fromStore } from "@xstate/store";
import { createActor } from "xstate";

interface ExampleStoreState {
  count: number;
  todos: string[];
}

const exampleStore = fromStore(
  // Initial context
  { count: 0, todos: [] } as ExampleStoreState,
  // Transitions
  {
    inc: (context, event: { by: number }) => {
      return {
        ...context,
        count: context.count + event.by,
      };
    },
    addTodo: (context, event: { todo: string }) => {
      return {
        ...context,
        todos: context.todos.concat(event.todo),
      };
    },
  }
);

const store = createActor(exampleStore);
store.subscribe((snapshot) => {
  console.log(snapshot);
});
store.start();

store.send({
  type: "inc",
  by: 2,
});
