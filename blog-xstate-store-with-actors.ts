/**
 * Train Railway System using XState Store with Actors and Immer
 *
 * This file models a simple train system using XState's store and actor concepts,
 * with Immer for easier state updates.
 *
 * Train Analogy:
 * 1. fromStore: Designing the railway network and train operation rules.
 * 2. createActor: Creating a specific train that will run on this network.
 * 3. Initial context: The train's starting status (passengers, fuel, current station).
 * 4. Transitions: How the train responds to different signals, now with Immer's magic:
 *    - BOARD: Passengers getting on the train.
 *    - DEPART: Train leaving for a new station (uses fuel).
 *    - REFUEL: Adding fuel to the train.
 * 5. subscribe: A passenger reporting the train's status after each change.
 * 6. start: Beginning the train's journey.
 * 7. send: Sending signals to the train to perform actions.
 *
 * This system demonstrates how a train can board passengers, travel between
 * stations, and manage its fuel levels, all while maintaining its state
 * using Immer for easier state updates.
 */

import { fromStore } from "@xstate/store";
import { createActor } from "xstate";
import { produce } from "immer";

interface TrainState {
  passengers: number;
  fuel: number;
  atStation: string;
}

const trainStore = fromStore(
  // Initial context
  {
    passengers: 0,
    fuel: 100,
    atStation: "Central",
  } as TrainState,
  // Transitions
  {
    BOARD: (context, event: { type: "BOARD"; count: number }) =>
      produce(context, (draft) => {
        draft.passengers += event.count;
      }),
    DEPART: (context, event: { type: "DEPART"; destination: string }) =>
      produce(context, (draft) => {
        if (draft.fuel >= 10) {
          draft.fuel -= 10;
          draft.atStation = event.destination;
        }
      }),
    REFUEL: (context, event: { type: "REFUEL"; amount: number }) =>
      produce(context, (draft) => {
        draft.fuel = Math.min(draft.fuel + event.amount, 100);
      }),
  }
);

const trainActor = createActor(trainStore);

trainActor.subscribe((snapshot) => {
  console.log("Train status updated:", snapshot.context);
});

trainActor.start();

console.log("Initial state:", trainActor.getSnapshot().context);

// Send events to update the train's state
trainActor.send({ type: "BOARD", count: 50 });
trainActor.send({ type: "DEPART", destination: "North Station" });
trainActor.send({ type: "REFUEL", amount: 20 });
trainActor.send({ type: "BOARD", count: 30 });
trainActor.send({ type: "DEPART", destination: "South Station" });

console.log("Final state:", trainActor.getSnapshot().context);
