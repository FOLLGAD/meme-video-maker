# Meme video maker

The second automated Youtube video maker I made. Only now, it's time for memes.

It allows users to easily create a video like this one, which is made by using only this tool: https://youtu.be/ifVO8gNJTb8

## What it does

Offers a clickable GUI where you can select multiple image and GIF memes. It automatically reads all text in the memes and lets you read them out, while revealing them part-by-part.

This means a video can be created in a matter of seconds or minutes depending on length, no editing required.

### Creating a video

https://user-images.githubusercontent.com/1856197/190837483-401805c5-8a72-47b5-b0a1-aa71e5f5deca.mp4

https://user-images.githubusercontent.com/1856197/190837485-da090660-5290-46a9-9b2d-8fbfab714440.mp4

### Final video (example)

https://user-images.githubusercontent.com/1856197/190837482-e0a248a8-1268-41d5-b69c-5c33d2c5e4c0.mp4






## Setup

- Node v14 (use `fnm` or `nvm` to easily switch between versions)

- Install `ffmpeg`, it's a pre-requisite

Set environment variables in `{client,server}/.env` (see `.env.example` for reference)

Needs AWS keys for S3 and DynamoDB. Needs Google Cloud credentials for the Image-to-Text OCR.

Uses two AWS S3 buckets, and one dynamoDB table. See `src/server.ts`

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

# Now client/build contains a static build of the site
```

Serve the builded directory on netlify or any web server

