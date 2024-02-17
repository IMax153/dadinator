import * as Http from "@effect/platform/HttpClient"
import * as Schema from "@effect/schema/Schema"
import { Chunk, Context, Effect, Layer, Option, RequestResolver, Stream } from "effect"

const PositiveInt = Schema.Int.pipe(Schema.positive())

export class DadJoke extends Schema.Class<DadJoke>()({
  id: Schema.string.pipe(Schema.nonEmpty()),
  joke: Schema.string.pipe(Schema.nonEmpty())
}) {}

export class DadJokeResponse extends DadJoke.extend<DadJokeResponse>()({
  status: PositiveInt
}) {}

export class DadJokeSearchResponse extends Schema.Class<DadJokeSearchResponse>()({
  current_page: PositiveInt,
  next_page: PositiveInt,
  previous_page: PositiveInt,
  limit: PositiveInt,
  search_term: Schema.string,
  status: PositiveInt,
  total_jokes: Schema.Int,
  total_pages: Schema.Int,
  results: Schema.array(DadJoke)
}) {}

export class DadJokeError extends Schema.TaggedError<DadJokeError>()(
  "DadJokeError",
  { message: Schema.string }
) {}

export class GetRandomDadJoke extends Schema.TaggedRequest<GetRandomDadJoke>()(
  "GetRandomDadJoke",
  DadJokeError,
  DadJoke,
  {}
) {}

export class SearchDadJokes extends Schema.TaggedRequest<SearchDadJokes>()(
  "SearchDadJokes",
  DadJokeError,
  Schema.array(DadJoke),
  {
    limit: Schema.number.pipe(Schema.int(), Schema.positive()),
    term: Schema.string.pipe(Schema.nonEmpty())
  }
) {}

export const make = Effect.gen(function*(_) {
  const defaultClient = yield* _(Http.client.Client)
  const client = defaultClient.pipe(
    Http.client.filterStatusOk,
    Http.client.mapRequest(Http.request.acceptJson),
    Http.client.mapRequest(Http.request.prependUrl("https://icanhazdadjoke.com"))
  )

  const decodeDadJoke = Http.response.schemaBodyJson(DadJokeResponse)
  const decodeDadJokeSearch = Http.response.schemaBodyJson(DadJokeSearchResponse)

  const GetRandomDadJokeResolver = RequestResolver.fromEffect((_: GetRandomDadJoke) => {
    return client(Http.request.get("/")).pipe(
      Effect.flatMap(decodeDadJoke),
      Effect.catchTags({
        ParseError: (error) => new DadJokeError({ message: error.toString() }),
        RequestError: (error) => new DadJokeError({ message: String(error.error) }),
        ResponseError: (error) => new DadJokeError({ message: String(error.error) })
      }),
      Effect.scoped
    )
  })

  const maxPageLimit = 30

  const SearchDadJokesResolver = RequestResolver.fromEffect((request: SearchDadJokes) => {
    const getLimit = (total: number) => Math.min(request.limit - total, maxPageLimit)

    const maybeNextPage = (
      page: number,
      total: number,
      response: DadJokeSearchResponse
    ): Option.Option<[page: number, total: number]> => {
      const newTotal = total + response.results.length
      // If the new total satisifes the requested limit or if there are not
      // enough jokes to satisfy the requested count, break out of pagination
      return newTotal >= request.limit || newTotal >= response.total_jokes
        ? Option.none()
        : Option.some([page + 1, newTotal])
    }

    const baseHttpRequest = Http.request.get("/search").pipe(
      Http.request.appendUrlParam("term", request.term)
    )
    return Stream.paginateChunkEffect([0, 0] as [page: number, total: number], ([page, total]) => {
      const httpRequest = baseHttpRequest.pipe(
        Http.request.appendUrlParams({
          limit: String(getLimit(total)),
          page: String(page)
        })
      )
      return client(httpRequest).pipe(
        Effect.flatMap(decodeDadJokeSearch),
        Effect.catchTags({
          ParseError: (error) => new DadJokeError({ message: error.toString() }),
          RequestError: (error) => new DadJokeError({ message: String(error.error) }),
          ResponseError: (error) => new DadJokeError({ message: String(error.error) })
        }),
        Effect.map((response) => [
          Chunk.unsafeFromArray(response.results),
          maybeNextPage(page, total, response)
        ])
      )
    }).pipe(
      Stream.runCollect,
      Effect.map(Chunk.toReadonlyArray),
      Effect.scoped
    )
  })

  const getRandomDadJoke = () => Effect.request(new GetRandomDadJoke(), GetRandomDadJokeResolver)

  const searchDadJokes = (limit: number, term: string) =>
    Effect.request(new SearchDadJokes({ limit, term }), SearchDadJokesResolver)

  return {
    getRandomDadJoke,
    searchDadJokes
  } as const
})

export class DadJokeRepo extends Context.Tag("dadinator/DadJokeRepo")<
  DadJokeRepo,
  Effect.Effect.Success<typeof make>
>() {
  static readonly Live = Layer.effect(this, make)
}
