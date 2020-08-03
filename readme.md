# 4chan

10 july: 9h
jul 27-aug 3: 15h

total 40 hrs?

## Setup

Set environment variables in `.env` (see `.env.example` for reference)

Install `ffmpeg`, it's a pre-requisite

Needs two empty AWS S3 buckets, and one dynamoDB table. See `src/server.ts`

## Run it

### Server

Build and run the server production build

```
$ npm i

$ npm run build

$ npm start
```

### Client

Build the client

```
$ npm run client-build

# Now client/build/static contains a static build of the site
```

Serve the static directory on netlify or any web server
