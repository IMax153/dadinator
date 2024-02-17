import { Command, Options, Span } from "@effect/cli"
import { Console, Effect, Either, Option, ReadonlyArray } from "effect"
import { DadJokeRepo } from "./DadJokeRepo.js"
import * as Version from "./internal/version.js"

const jokeId = Options.text("joke-id").pipe(
  Options.withDescription("The identifier of the dad joke to fetch")
)
const search = Options.text("search").pipe(
  Options.withAlias("s"),
  Options.withDescription("The search term to use to filter dad jokes"),
  Options.optional
)
const count = Options.integer("count").pipe(
  Options.withAlias("c"),
  Options.withDescription("The number of dad jokes to retrieve")
)
const options = jokeId.pipe(
  Options.orElseEither(Options.all({ count, search })),
  Options.optional
)

const dadinator = Command.make(
  "dadinator",
  { options },
  ({ options }) =>
    DadJokeRepo.pipe(Effect.flatMap((repo) =>
      Option.match(options, {
        onNone: () =>
          repo.getDadJoke(Option.none()).pipe(
            Effect.flatMap(({ joke }) => Console.log(joke))
          ),
        onSome: Either.match({
          onLeft: (jokeId) =>
            repo.getDadJoke(Option.some(jokeId)).pipe(
              Effect.flatMap(({ joke }) => Console.log(joke))
            ),
          onRight: ({ count, search }) =>
            repo.getDadJokes(count, search).pipe(
              Effect.flatMap((dadJokes) => {
                const jokes = ReadonlyArray.join(
                  ReadonlyArray.map(dadJokes, ({ joke }) => joke),
                  "\n"
                )
                return Console.log(jokes)
              })
            )
        })
      })
    ))
)

export const run = dadinator.pipe(Command.run({
  name: "Dadinator",
  version: Version.moduleVersion,
  summary: Span.text("Fetches dad jokes from the https://icanhazdadjoke.com API")
}))
