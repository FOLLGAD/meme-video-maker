module.exports = {
    apps: [
        {
            name: "carp",
            script: "dist/server.js",
            watch: "dist",
            post_update: ["npm i", "npm run build"],
        },
    ],
    deploy: {
        production: {
            key: "~/.ssh/redditors.id_rsa",
            user: "ubuntu",
            host: "image.redditvideomaker.com",
            ref: "origin/master",
            repo: "git@github.com:FOLLGAD/carp.git",
            path: "/home/ubuntu/carp",
            "pre-deploy-local": "",
            "post-deploy": "cd server; npm ci; npm run build", // PM2 will (hopefully) automatically restart on file changes
            "pre-setup": "",
        },
    },
}
