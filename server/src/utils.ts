export const makeIntoS3Url = (key) =>
    `http://carp-uploads.s3.eu-central-1.amazonaws.com/${key}`

export const makeIntoGCSUrl = (gcId: string) =>
    `https://storage.googleapis.com/${gcId.slice(5)}`

export const signedUrlIntoId = (url: string): string => {
    let urlObj = new URL(url)
    let path = urlObj.pathname // has the form `/<bucket-name>/<object-id>`
    return "gs:/" + path
}
