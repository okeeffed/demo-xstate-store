import { setup, createActor, assign, assertEvent } from "xstate";
import { Effect, pipe } from "effect";

type BoardEvent = { type: "BOARD"; count: number };
type DepartEvent = { type: "DEPART"; destination: string };
type RefuelEvent = { type: "REFUEL"; amount: number };
type PauseEvent = { type: "PAUSE"; ms: number };

// Define the events using discriminated union
type TrainEvent = BoardEvent | DepartEvent | RefuelEvent | PauseEvent;

interface TrainContext {
  passengers: number;
  fuel: number;
  atStation: string;
}

// EffectTS actions
const boardPassengers = ({
  context,
  event,
}: {
  context: TrainContext;
  event: BoardEvent;
}) =>
  Effect.succeed({ ...context, passengers: context.passengers + event.count });

const departTrain = ({
  context,
  event,
}: {
  context: TrainContext;
  event: DepartEvent;
}) =>
  Effect.gen(function* (_) {
    if (context.fuel >= 10) {
      return {
        ...context,
        fuel: context.fuel - 10,
        atStation: event.destination,
      };
    }
    return context; // Not enough fuel, state remains unchanged
  });

const refuelTrain = ({
  context,
  event,
}: {
  context: TrainContext;
  event: RefuelEvent;
}) =>
  Effect.succeed({
    ...context,
    fuel: Math.min(context.fuel + event.amount, 100),
  });

interface AssertTrainEventEffect {
  context: TrainContext;
  event: TrainEvent;
}

// Effectified assertEvent
const assertEventEffect =
  <T extends TrainEvent["type"]>(eventType: T) =>
  ({ context, event }: AssertTrainEventEffect) => {
    assertEvent(event, eventType);
    return {
      context,
      event: event as Extract<TrainEvent, { type: T }>,
    };
  };

// Create the machine
const trainMachine = setup({
  types: {} as {
    context: TrainContext;
    events: TrainEvent;
  },
  actions: {
    board: assign((assignment) =>
      pipe(
        assignment,
        assertEventEffect("BOARD"),
        boardPassengers,
        Effect.runSync
      )
    ),

    depart: assign((assignment) =>
      pipe(assignment, assertEventEffect("DEPART"), departTrain, Effect.runSync)
    ),

    refuel: assign((assignment) =>
      pipe(assignment, assertEventEffect("REFUEL"), refuelTrain, Effect.runSync)
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

// Send events to update the train's state
trainActor.send({ type: "BOARD", count: 50 });
trainActor.send({ type: "DEPART", destination: "North Station" });
trainActor.send({ type: "REFUEL", amount: 20 });
trainActor.send({ type: "BOARD", count: 30 });
trainActor.send({ type: "DEPART", destination: "South Station" });

console.log("Final state:", trainActor.getSnapshot().context);
