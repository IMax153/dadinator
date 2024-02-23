import { Args, Command, Options, Span } from "@effect/cli"
import { Console, Effect } from "effect"
import { CommandExecutor, Command as Cmd } from "@effect/platform"
import { DadJokeRepo } from "./DadJokeRepo.js"
import * as Version from "./internal/version.js"

const limit = Options.integer("limit").pipe(
  Options.withAlias("l"),
  Options.withDescription("The maximum number of dad jokes to fetch"),
  Options.withDefault(Number.MAX_SAFE_INTEGER)
)
const term = Args.text({ name: "term" }).pipe(
  Args.withDescription("The search term to use to filter dad jokes")
)

const searchCommand = Command.make("search", { limit, term }).pipe(
  Command.withDescription(
    "Search the icanhazdadjoke API for dad jokes matching "
      + "the specified term"
  ),
  Command.withHandler(({ limit, term }) =>
    DadJokeRepo.pipe(
      Effect.andThen((repo) => repo.searchDadJokes(limit, term)),
      Effect.andThen((jokes) => Effect.gen(function* ($) {
        const exec = yield* $(CommandExecutor.CommandExecutor)
        for (const joke of jokes) {
          yield* $(Effect.all([
            exec.exitCode(Cmd.make("say", `Ok daddy, do you know this one yet? ${joke}`)),
            Console.log(joke)
          ], {
            concurrency: 'unbounded'
          }))
        }
      }))
    )
  )
)

const randomCommand = Command.make("random").pipe(
  Command.withDescription("Fetch a random dad joke from the icanhazdadjoke API"),
  Command.withHandler(() =>
    DadJokeRepo.pipe(
      Effect.andThen((repo) => repo.getRandomDadJoke()),
      Effect.andThen(({ joke }) => Effect.gen(function* ($) {
        const exec = yield* $(CommandExecutor.CommandExecutor)
        yield* $(Effect.all([
          exec.exitCode(Cmd.make("say", `Ok daddy, do you know this one yet? ${joke}`)),
          Console.log(joke)
        ], {
          concurrency: 'unbounded'
        }))
      }))
    )
  )
)

const dadinator = Command.make("dadinator").pipe(
  Command.withSubcommands([randomCommand, searchCommand])
)

export const run = dadinator.pipe(Command.run({
  name: "Dadinator",
  version: Version.moduleVersion,
  summary: Span.text("Fetches dad jokes from the https://icanhazdadjoke.com API")
}))
