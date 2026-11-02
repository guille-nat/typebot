import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  Config,
  Effect,
  Layer,
  Option,
  Redacted,
  Schema,
  ServiceMap,
  Stream,
} from "effect";
import { Client } from "minio";
import { createAzureObjectStorage } from "./createAzureObjectStorage";

export class S3ClientUploadError extends Schema.TaggedErrorClass<S3ClientUploadError>()(
  "@typebot/S3ClientUploadError",
  {
    message: Schema.String,
    cause: Schema.optional(Schema.Defect),
  },
) {}

type UploadBody = Buffer | Readable | Stream.Stream<Uint8Array, unknown>;

export class S3UploadClient extends ServiceMap.Service<
  S3UploadClient,
  {
    uploadObject: (params: {
      key: string;
      body: UploadBody;
      metadata?: Record<string, string>;
    }) => Effect.Effect<void, S3ClientUploadError>;
  }
>()("@typebot/S3UploadClient") {
  static readonly layer = Layer.effect(
    S3UploadClient,
    Effect.gen(function* () {
      const s3EndpointOption = yield* Config.option(
        Config.string("S3_ENDPOINT"),
      );
      const putObject = Option.isSome(s3EndpointOption)
        ? yield* makeMinioPutObject(s3EndpointOption.value)
        : yield* makeAzurePutObject;

      const uploadObject = Effect.fn("S3UploadClient.uploadObject")(function* ({
        key,
        body,
        metadata,
      }: {
        key: string;
        body: UploadBody;
        metadata?: Record<string, string>;
      }) {
        const readableBody = yield* toReadable(body);

        yield* Effect.tryPromise({
          try: () => putObject({ key, body: readableBody, metadata }),
          catch: (error) =>
            new S3ClientUploadError({
              message: formatUnknownError(error),
              cause: error,
            }),
        }).pipe(Effect.asVoid);
      });

      return S3UploadClient.of({
        uploadObject,
      });
    }),
  );
}

type PutObject = (params: {
  key: string;
  body: Buffer | Readable;
  metadata?: Record<string, string>;
}) => Promise<unknown>;

const makeMinioPutObject = (endpoint: string) =>
  Effect.gen(function* () {
    const accessKey = yield* Config.string("S3_ACCESS_KEY");
    const secretKey = yield* Config.redacted("S3_SECRET_KEY");
    const portOption = yield* Config.option(Config.number("S3_PORT"));
    const region = yield* Config.string("S3_REGION").pipe(
      Config.withDefault("us-east-1"),
    );
    const ssl = yield* Config.boolean("S3_SSL").pipe(Config.withDefault(true));
    const bucket = yield* Config.string("S3_BUCKET");
    const port = Option.isSome(portOption) ? portOption.value : undefined;

    const client = new Client({
      endPoint: endpoint,
      port,
      useSSL: ssl,
      accessKey,
      secretKey: Redacted.value(secretKey),
      region,
    });

    const putObject: PutObject = ({ key, body, metadata }) =>
      client.putObject(bucket, key, body, undefined, metadata);

    return putObject;
  });

const makeAzurePutObject = Effect.gen(function* () {
  const accountName = yield* Config.string("AZURE_STORAGE_ACCOUNT_NAME");
  const accountKey = yield* Config.redacted("AZURE_STORAGE_ACCOUNT_KEY");
  const blobEndpointOption = yield* Config.option(
    Config.string("AZURE_STORAGE_BLOB_ENDPOINT"),
  );
  const publicContainerName = yield* Config.string(
    "AZURE_STORAGE_PUBLIC_CONTAINER",
  ).pipe(Config.withDefault("typebot-public"));
  const privateContainerName = yield* Config.string(
    "AZURE_STORAGE_PRIVATE_CONTAINER",
  ).pipe(Config.withDefault("typebot-private"));

  const objectStorage = createAzureObjectStorage({
    accountName,
    accountKey: Redacted.value(accountKey),
    blobEndpoint: Option.getOrUndefined(blobEndpointOption),
    publicContainerName,
    privateContainerName,
  });

  const putObject: PutObject = ({ key, body, metadata }) =>
    objectStorage.putObject({
      key,
      body,
      headers: {
        contentType: metadata?.["Content-Type"],
        cacheControl: metadata?.["Cache-Control"],
        contentDisposition: metadata?.["Content-Disposition"],
      },
    });

  return putObject;
});

export const S3UploadClientLayer = S3UploadClient.layer;

const toReadable = (
  body: UploadBody,
): Effect.Effect<Buffer | Readable, never> => {
  if (Buffer.isBuffer(body) || body instanceof Readable) {
    return Effect.succeed(body);
  }

  return Effect.sync(() =>
    Readable.fromWeb(
      Stream.toReadableStream(
        body as Stream.Stream<Uint8Array, unknown, never>,
      ) as unknown as NodeReadableStream<any>,
    ),
  );
};

const formatUnknownError = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
