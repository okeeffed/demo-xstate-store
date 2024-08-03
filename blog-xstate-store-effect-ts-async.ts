import { setup, createActor, assign, assertEvent } from "xstate";
import { Effect, pipe } from "effect";

// Define the events using discriminated union
type TrainEvent =
  | { type: "BOARD"; count: number }
  | { type: "DEPART"; destination: string }
  | { type: "REFUEL"; amount: number };

interface TrainContext {
  passengers: number;
  fuel: number;
  atStation: string;
}

// EffectTS actions
const boardPassengers = ({
  context,
  count,
}: {
  context: TrainContext;
  count: number;
}) => Effect.succeed({ ...context, passengers: context.passengers + count });

const departTrain = ({
  context,
  destination,
}: {
  context: TrainContext;
  destination: string;
}) =>
  Effect.promise(
    () =>
      new Promise<TrainContext>((resolve) => {
        Effect.log(`Train preparing to depart to ${destination}...`);
        setTimeout(() => {
          Effect.log(`Train departing to ${destination}...`);
          if (context.fuel >= 10) {
            resolve({
              ...context,
              fuel: context.fuel - 10,
              atStation: destination,
            });
          } else {
            Effect.log(`Not enough fuel to depart to ${destination}.`);
            resolve(context); // Not enough fuel, state remains unchanged
          }
        }, 2000);
      })
  );

const refuelTrain = ({
  context,
  amount,
}: {
  context: TrainContext;
  amount: number;
}) =>
  Effect.succeed({ ...context, fuel: Math.min(context.fuel + amount, 100) });

// Effectified assertEvent
const assertEventEffect = <T extends TrainEvent["type"]>(
  event: TrainEvent,
  eventType: T
) =>
  Effect.sync(() => {
    assertEvent(event, eventType);
    return event as Extract<TrainEvent, { type: T }>;
  });

// Create the machine
const trainMachine = setup({
  types: {} as {
    context: TrainContext;
    events: TrainEvent;
  },
  actions: {
    board: assign(({ context, event }) =>
      assertEventEffect(event, "BOARD").pipe(
        Effect.flatMap((event) =>
          boardPassengers({ context, count: event.count })
        ),
        Effect.runSync
      )
    ),

    depart: ({ context, event }) =>
      assertEventEffect(event, "DEPART").pipe(
        Effect.flatMap((e) =>
          departTrain({ context, destination: e.destination })
        ),

        Effect.map((newContext) => assign(() => newContext))
      ),

    refuel: assign(({ context, event }) =>
      assertEventEffect(event, "REFUEL").pipe(
        Effect.flatMap((e) => refuelTrain({ context, amount: e.amount })),
        Effect.runSync
      )
    ),
  },
}).createMachine({
  context: {
    passengers: 0,
    fuel: 100,
    atStation: "Central",
  },
  initial: "idle",
  states: {
    idle: {
      on: {
        BOARD: {
          actions: ["board"],
        },
        DEPART: {
          actions: ["depart"],
        },
        REFUEL: {
          actions: ["refuel"],
        },
      },
    },
  },
});

const trainActor = createActor(trainMachine);

trainActor.subscribe((snapshot) => {
  console.log("Train status updated:", snapshot.context);
});

trainActor.start();

console.log("Initial state:", trainActor.getSnapshot().context);

async function runSimulation() {
  console.log("Simulation started.");

  console.log("Boarding 50 passengers...");
  trainActor.send({ type: "BOARD", count: 50 });

  console.log("Attempting to depart to North Station...");
  await trainActor.send({ type: "DEPART", destination: "North Station" });
  await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait for state update

  console.log("Refueling train...");
  trainActor.send({ type: "REFUEL", amount: 20 });

  console.log("Boarding 30 more passengers...");
  trainActor.send({ type: "BOARD", count: 30 });

  console.log("Attempting to depart to South Station...");
  await trainActor.send({ type: "DEPART", destination: "South Station" });
  await new Promise((resolve) => setTimeout(resolve, 2500)); // Wait for state update

  console.log("Simulation completed.");
  console.log("Final state:", trainActor.getSnapshot().context);
}

runSimulation();
