/**
 * Train Railway System using XState Store with Immer
 *
 * This file models a simple train system using XState's store with Immer for state management.
 *
 * Train Analogy:
 * 1. createStoreWithProducer: Designing the railway network and train operation rules.
 * 2. produce (Immer): Magic that allows us to easily update the train's status.
 * 3. Initial context: The train's starting condition (passengers, fuel, current station).
 * 4. Transitions: The train's rule book for responding to different signals:
 *    - BOARD: Passengers getting on the train.
 *    - DEPART: Train leaving for a new station (uses fuel).
 *    - REFUEL: Adding fuel to the train.
 * 5. getSnapshot: Checking the train's current status at any moment.
 * 6. subscribe: A passenger reporting the train's status after each change.
 * 7. send: Sending signals to the train to perform actions.
 *
 * This system demonstrates how a train can board passengers, travel between
 * stations, and manage its fuel levels, all while maintaining its state
 * using an easy-to-update approach (thanks to Immer).
 */

import { createStoreWithProducer } from "@xstate/store";
import { produce } from "immer";

interface TrainState {
  passengers: number;
  fuel: number;
  atStation: string;
}

type Events =
  | { type: "BOARD"; count: number }
  | { type: "DEPART"; destination: string }
  | { type: "REFUEL"; amount: number };

const trainStore = createStoreWithProducer(
  // Producer
  produce,
  // Initial context
  {
    passengers: 0,
    fuel: 100,
    atStation: "Central",
  } as TrainState,
  // Transitions
  {
    BOARD: (context, event: { type: "BOARD"; count: number }) => {
      context.passengers += event.count;
    },
    DEPART: (context, event: { type: "DEPART"; destination: string }) => {
      if (context.fuel >= 10) {
        context.fuel -= 10;
        context.atStation = event.destination;
      }
    },
    REFUEL: (context, event: { type: "REFUEL"; amount: number }) => {
      context.fuel = Math.min(context.fuel + event.amount, 100);
    },
  }
);

// Get the initial state
console.log("Initial state:", trainStore.getSnapshot());

// Subscribe to state changes
trainStore.subscribe((snapshot) => {
  console.log("Train status updated:", snapshot.context);
});

// Send events to update the train's state
trainStore.send({ type: "BOARD", count: 50 });
trainStore.send({ type: "DEPART", destination: "North Station" });
trainStore.send({ type: "REFUEL", amount: 20 });
trainStore.send({ type: "BOARD", count: 30 });
trainStore.send({ type: "DEPART", destination: "South Station" });

// Get the final state
console.log("Final state:", trainStore.getSnapshot());
