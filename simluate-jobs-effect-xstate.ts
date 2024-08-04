import { setup, assign, createActor, fromPromise } from "xstate";
import { Effect, Random } from "effect";
import pc from "picocolors";
import { Schedule } from "effect";

interface JobContext {
  assetId: string | null;
  uploadUrl: string | null;
  emailSent: boolean;
  error: string | null;
}

type JobEvents =
  | { type: "CREATE_ASSET" }
  | { type: "UPLOAD_ASSET" }
  | { type: "EMAIL_CLIENT" }
  | { type: "RETRY" };

// Effect-based operations
const createAsset = Effect.gen(function* () {
  yield* Effect.sleep(1000);
  const shouldFail = yield* Random.nextBoolean;
  if (shouldFail) {
    yield* Effect.fail(new Error("Failed to create asset"));
  }
  return { assetId: `asset-${Math.random().toString(36).substr(2, 9)}` };
});

const uploadAsset = Effect.gen(function* () {
  yield* Effect.sleep(1000);
  const shouldFail = yield* Random.nextBoolean;
  if (shouldFail) {
    yield* Effect.fail(new Error("Failed to upload asset"));
  }
  return {
    uploadUrl: `https://example.com/asset-${Math.random()
      .toString(36)
      .substr(2, 9)}`,
  };
});

const emailClient = Effect.gen(function* () {
  yield* Effect.sleep(1000);
  const shouldFail = yield* Random.nextBoolean;
  if (shouldFail) {
    yield* Effect.fail(new Error("Failed to send email"));
  }
  return { emailSent: true };
});

const jobMachine = setup({
  types: {
    context: {} as JobContext,
    events: {} as JobEvents,
  },
  actors: {
    createAsset: fromPromise(() => createAsset.pipe(Effect.runPromise)),
    uploadAsset: fromPromise(() => uploadAsset.pipe(Effect.runPromise)),
    emailClient: fromPromise(() => emailClient.pipe(Effect.runPromise)),
  },
}).createMachine({
  id: "jobMachine",
  initial: "start",
  context: {
    assetId: null,
    uploadUrl: null,
    emailSent: false,
    error: null,
  },
  states: {
    start: {
      on: { CREATE_ASSET: "creatingAsset" },
    },
    creatingAsset: {
      invoke: {
        src: "createAsset",
        onDone: {
          target: "uploadingAsset",
          actions: assign({
            assetId: ({ event }) => event.output.assetId,
            error: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    uploadingAsset: {
      invoke: {
        src: "uploadAsset",
        onDone: {
          target: "emailingClient",
          actions: assign({
            uploadUrl: ({ event }) => event.output.uploadUrl,
            error: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    emailingClient: {
      invoke: {
        src: "emailClient",
        onDone: {
          target: "complete",
          actions: assign({
            emailSent: ({ event }) => event.output.emailSent,
            error: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            error: ({ event }) => (event.error as Error).message,
          }),
        },
      },
    },
    complete: { type: "final" },
    error: {
      on: {
        RETRY: [
          {
            target: "creatingAsset",
            guard: ({ context }) => context.assetId === null,
          },
          {
            target: "uploadingAsset",
            guard: ({ context }) =>
              context.assetId !== null && context.uploadUrl === null,
          },
          {
            target: "emailingClient",
            guard: ({ context }) =>
              context.uploadUrl !== null && !context.emailSent,
          },
        ],
      },
    },
  },
});

// Simulated remote storage
let remoteState: string | null = null;

function updateRemoteState(serializedState: string) {
  console.log(pc.bgYellow("Updating remote state:"), serializedState);
  remoteState = serializedState;
}

const actor = createActor(jobMachine);

actor.subscribe((state) => {
  console.log(pc.bgGreen("Current state:"), state.value);
  console.log(pc.bgMagenta("Current context:"), state.context);
  updateRemoteState(JSON.stringify(state));
});

actor.start();

// Simulate the job flow
console.log(pc.yellow("\n--- Starting job flow ---"));
actor.send({ type: "CREATE_ASSET" });

// Wait for the machine to finish or reach an error state
const waitForCompletion = () => {
  return new Promise((resolve) => {
    const subscription = actor.subscribe((state) => {
      if (state.matches("complete") || state.matches("error")) {
        subscription.unsubscribe();
        resolve(state);
      }
    });
  });
};

let retryCount = 0;
const maxRetries = 3;

const runSimulation = () => {
  console.log(
    pc.yellow(`\n--- Starting job flow (Attempt ${retryCount + 1}) ---`)
  );
  actor.send({ type: "CREATE_ASSET" });

  return waitForCompletion().then((finalState: any) => {
    console.log(pc.yellow("\n--- Job flow completed ---"));
    console.log("Final state:", finalState.value);
    console.log("Final context:", finalState.context);

    if (finalState.matches("error") && retryCount < maxRetries) {
      console.log(pc.green("Retrying..."));
      retryCount++;
      actor.send({ type: "RETRY" });
      return runSimulation();
    } else if (finalState.matches("error")) {
      console.log(pc.bgRed("Max retries reached. Ending simulation."));
    }
  });
};

runSimulation().then(() => {
  console.log(pc.bgGreen("\n--- Simulation completed ---"));
  actor.stop();
});

const expBackoff = Schedule.exponential(1000).pipe(
  Schedule.compose(Schedule.recurs(maxRetries))
);
