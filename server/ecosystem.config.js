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
            key: "~/.ssh/redditors-new.pem",
            user: "ubuntu",
            host: "image.redditvideomaker.com",
            ref: "origin/master",
            repo: "git@github.com:FOLLGAD/carp.git",
            path: "/home/ubuntu/carp/server",
            "pre-deploy-local": "",
            "post-deploy": `npm i &&
                            npm run build &&
                            pm2 startOrRestart ecosystem.config.js --env production`,
            "pre-setup": "",
        },
    },
}
