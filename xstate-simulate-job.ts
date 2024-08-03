import { setup, assign, createActor, ActorRefFrom } from "xstate";
import { createBrowserInspector } from "@statelyai/inspect";

const inspector = createBrowserInspector();

interface JobContext {
  assetId: string | null;
  uploadUrl: string | null;
  emailSent: boolean;
  error: string | null;
}

type JobEvents =
  | { type: "CREATE_ASSET" }
  | { type: "ASSET_CREATED"; assetId: string }
  | { type: "UPLOAD_ASSET" }
  | { type: "ASSET_UPLOADED"; uploadUrl: string }
  | { type: "EMAIL_CLIENT" }
  | { type: "EMAIL_SENT" }
  | { type: "ERROR"; message: string }
  | { type: "RETRY" };

const jobMachine = setup({
  types: {
    context: {} as JobContext,
    events: {} as JobEvents,
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
      on: {
        CREATE_ASSET: "creatingAsset",
      },
    },
    creatingAsset: {
      on: {
        ASSET_CREATED: {
          target: "uploadingAsset",
          actions: assign({
            assetId: ({ event }) => event.assetId,
            error: null,
          }),
        },
        ERROR: {
          target: "error",
          actions: assign({ error: ({ event }) => event.message }),
        },
      },
    },
    uploadingAsset: {
      on: {
        ASSET_UPLOADED: {
          target: "emailingClient",
          actions: assign({
            uploadUrl: ({ event }) => event.uploadUrl,
            error: null,
          }),
        },
        ERROR: {
          target: "error",
          actions: assign({ error: ({ event }) => event.message }),
        },
      },
    },
    emailingClient: {
      on: {
        EMAIL_SENT: {
          target: "complete",
          actions: assign({
            emailSent: () => true,
            error: null,
          }),
        },
        ERROR: {
          target: "error",
          actions: assign({ error: ({ event }) => event.message }),
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

type JobActor = ActorRefFrom<typeof jobMachine>;

function serializeState(actor: JobActor) {
  const snapshot = actor.getSnapshot();
  return JSON.stringify(snapshot);
}

function createActorFromSerializedState(serializedState: string): JobActor {
  const snapshot = JSON.parse(serializedState) as ReturnType<
    JobActor["getSnapshot"]
  >;

  return createActor(jobMachine, {
    inspect: inspector.inspect,
    // input: snapshot.context,
    snapshot: snapshot,
  }) as JobActor;
}

// Simulated remote storage
let remoteState: string | null = null;

function updateRemoteState(serializedState: string) {
  console.log("Updating remote state:", serializedState);
  remoteState = serializedState;
}

function getRemoteState(): string | null {
  return remoteState;
}

let actor: JobActor = createActor(jobMachine, { inspect: inspector.inspect });

// Subscribe to the actor
actor.subscribe((snapshot) => {
  const serializedState = serializeState(actor);
  updateRemoteState(serializedState);

  if (snapshot.matches("error")) {
    console.log("Error detected:", snapshot.context.error);
  }
});

function sendEventAndLog(event: JobEvents) {
  actor.send(event);
  const snapshot = actor.getSnapshot();
  console.log("\nEvent sent:", event);
  console.log("Current state:", snapshot.value);
  console.log("Current context:", snapshot.context);
}

function simulateScenario(scenarioName: string, events: JobEvents[]) {
  console.log(`\n--- ${scenarioName} ---`);
  events.forEach(sendEventAndLog);
}

function simulateStopAndRestart() {
  console.log("\n--- Simulating stop and restart ---");
  actor.stop();
  console.log("Process stopped. Restarting from saved state...");

  const savedState = getRemoteState();
  if (savedState) {
    actor = createActorFromSerializedState(savedState);
    actor.subscribe((snapshot) => {
      const serializedState = serializeState(actor);
      updateRemoteState(serializedState);

      if (snapshot.matches("error")) {
        console.log("Error detected:", snapshot.context.error);
      }
    });
    actor.start();

    console.log("Resumed from saved state:");
    console.log("Current state:", actor.getSnapshot().value);
    console.log("Current context:", actor.getSnapshot().context);
  } else {
    console.log("No saved state found. Starting from initial state.");
    actor = createActor(jobMachine, { inspect: inspector.inspect });
    actor.start();
  }
}

// Start the actor
actor.start();

// Scenario 1: Error during asset creation
simulateScenario("Scenario 1: Error during asset creation", [
  { type: "CREATE_ASSET" },
  { type: "ERROR", message: "Failed to create asset" },
  { type: "RETRY" },
  { type: "ASSET_CREATED", assetId: "asset123" },
]);

simulateStopAndRestart();

// Scenario 2: Error during asset upload
simulateScenario("Scenario 2: Error during asset upload", [
  { type: "UPLOAD_ASSET" },
  { type: "ERROR", message: "Failed to upload asset" },
  { type: "RETRY" },
  { type: "ASSET_UPLOADED", uploadUrl: "https://example.com/asset123" },
]);

simulateStopAndRestart();

// Scenario 3: Error during client email
simulateScenario("Scenario 3: Error during client email", [
  { type: "EMAIL_CLIENT" },
  { type: "ERROR", message: "Failed to send email" },
  { type: "RETRY" },
  { type: "EMAIL_SENT" },
]);

simulateStopAndRestart();

console.log("\n--- Final state ---");
console.log("Current state:", actor.getSnapshot().value);
console.log("Final context:", actor.getSnapshot().context);
