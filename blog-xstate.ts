/**
 * Train Railway System using XState v5
 *
 * This file demonstrates the use of XState v5 to model a simple train system.
 *
 * Key Concepts:
 * 1. setup: The planning phase of building a railway system.
 * 2. createMachine: Designing the complete railway network.
 * 3. context: The train's current status (passengers, fuel, etc.).
 * 4. events: Signals that can be sent to the train.
 * 5. on: The rule book for how the train should respond to signals.
 * 6. actions: Tasks performed when responding to signals.
 * 7. assign: Updating the train's status.
 * 8. createActor: Creating a specific train that will run on this network.
 *
 * The system allows for boarding passengers, departing to different stations,
 * and refueling the train, all while maintaining the train's state.
 */
import { setup, assign, createActor } from "xstate";
import { createBrowserInspector } from "@statelyai/inspect";

const inspector = createBrowserInspector();

interface TrainState {
  passengers: number;
  fuel: number;
  atStation: string;
}

type Events =
  | { type: "BOARD"; count: number }
  | { type: "DEPART"; destination: string }
  | { type: "REFUEL"; amount: number };

const trainMachine = setup({
  types: {
    context: {} as TrainState,
    events: {} as Events,
  },
}).createMachine({
  context: {
    passengers: 0,
    fuel: 100,
    atStation: "Central",
  },
  on: {
    BOARD: {
      actions: assign({
        passengers: ({ context, event }) => context.passengers + event.count,
      }),
    },
    DEPART: {
      actions: [
        assign({
          fuel: ({ context }) => context.fuel - 10,
          atStation: ({ event }) => event.destination,
        }),
      ],
      guard: ({ context }) => context.fuel >= 10,
    },
    REFUEL: {
      actions: assign({
        fuel: ({ context, event }) =>
          Math.min(context.fuel + event.amount, 100),
      }),
    },
  },
});

// Create an actor for our train
const trainActor = createActor(trainMachine, {
  inspect: inspector.inspect,
});

// Start the train's journey
trainActor.start();

console.log("Initial state:", trainActor.getSnapshot().context);

// Subscribe to state changes
trainActor.subscribe((snapshot) => {
  console.log("Train status updated:", snapshot.context);
});

// Send events to the train
trainActor.send({ type: "BOARD", count: 50 });
trainActor.send({ type: "DEPART", destination: "North Station" });
trainActor.send({ type: "REFUEL", amount: 20 });
trainActor.send({ type: "BOARD", count: 30 });
trainActor.send({ type: "DEPART", destination: "South Station" });
