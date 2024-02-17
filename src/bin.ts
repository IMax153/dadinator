import { NodeContext, NodeHttpClient, NodeRuntime } from "@effect/platform-node"
import { Effect, Layer } from "effect"
import { run } from "./Cli.js"
import { DadJokeRepo } from "./DadJokeRepo.js"

const MainLive = DadJokeRepo.Live.pipe(
  Layer.provide(NodeHttpClient.layer),
  Layer.merge(NodeContext.layer)
)

run(process.argv).pipe(
  Effect.provide(MainLive),
  Effect.tapErrorCause(Effect.logError),
  NodeRuntime.runMain
)
