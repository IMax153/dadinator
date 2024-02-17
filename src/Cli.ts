import { Command, Options, Span } from "@effect/cli"
import { Console, Effect } from "effect"
import { DadJokeRepo } from "./DadJokeRepo.js"
import * as Version from "./internal/version.js"

const limit = Options.integer("limit").pipe(
  Options.withAlias("l"),
  Options.withDescription("The maximum number of dad jokes to fetch"),
  Options.withDefault(Number.MAX_SAFE_INTEGER)
)
const term = Options.text("term").pipe(
  Options.withAlias("t"),
  Options.withDescription("The search term to use to filter dad jokes")
)

const randomCommand = Command.make("random").pipe(
  Command.withHandler(() =>
    DadJokeRepo.pipe(
      Effect.flatMap((repo) => repo.getRandomDadJoke()),
      Effect.flatMap(({ joke }) => Console.log(joke))
    )
  )
)

const searchCommand = Command.make("search", { limit, term }).pipe(
  Command.withHandler(({ limit, term }) =>
    DadJokeRepo.pipe(
      Effect.flatMap((repo) => repo.searchDadJokes(limit, term)),
      Effect.flatMap((jokes) => Console.log(jokes.map(({ joke }) => joke).join("\n")))
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
