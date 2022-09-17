# meme-maker

## Setup

- Node v14 (use `fnm` to your benefit)

- Install `ffmpeg`, it's a pre-requisite

Set environment variables in `.env` (see `.env.example` for reference)

Uses two AWS S3 buckets, and one dynamoDB table. See `src/server.ts`

## Run it

Build and run the server production build

```
$ npm i

$ npm run build

$ npm start
```

## Deploy

Netlify is connected to the frontend, so any changes to the `/client` folder will trigger
a build.

To deploy the backend, do:

```bash
$ pm2 deploy ecosystem.config.js production
```

It's running on AWS.
